const { Worker } = require('bullmq');
const { connection, queueName } = require('./queue');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const JOBS_DIR = path.join(__dirname, 'tmp', 'jobs');

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function appendLog(file, text) {
  await fs.appendFile(file, text, 'utf8');
}

function runCmd(cmd, cwd, env, logFile) {
  return new Promise((resolve, reject) => {
    // Use /bin/sh -lc to run full shell commands
    const child = spawn('/bin/sh', ['-lc', cmd], {
      cwd,
      env: { ...process.env, ...env },
    });

    child.stdout.on('data', async (d) => {
      const s = d.toString();
      await appendLog(logFile, s);
    });
    child.stderr.on('data', async (d) => {
      const s = d.toString();
      await appendLog(logFile, s);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${cmd}`));
    });
  });
}

async function cloneRepo({ repoFullName, branch = 'main', token, cwd, logFile }) {
  const safeBranch = branch || 'main';
  const url = token
    ? `https://x-access-token:${token}@github.com/${repoFullName}.git`
    : `https://github.com/${repoFullName}.git`;

  await appendLog(logFile, `Cloning ${repoFullName} (branch ${safeBranch})...\n`);
  await runCmd(`git init . && git remote add origin ${url} && git fetch --depth=1 origin ${safeBranch} && git checkout -b ${safeBranch} FETCH_HEAD`, cwd, {}, logFile);
  await appendLog(logFile, `Clone completed.\n`);
}

const worker = new Worker(
  queueName,
  async (job) => {
    const jobId = String(job.id);
    const jobDir = path.join(JOBS_DIR, jobId);
    const logFile = path.join(jobDir, 'log.txt');

    await ensureDir(jobDir);
    await appendLog(logFile, `Job ${jobId} started at ${new Date().toISOString()}\n`);

    const {
      repoFullName, // "owner/name" or undefined
      branch,
      steps,       // array of shell commands
      env = {},    // environment vars for steps
      token,       // GitHub token if private repo
    } = job.data || {};

    const effectiveSteps = Array.isArray(steps) && steps.length
      ? steps
      : [
          'echo "DailyCodeDeploy demo pipeline"',
          'node -v',
          'npm -v',
        ];

    // If repo is specified, clone it into jobDir
    if (repoFullName) {
      await job.updateProgress({ stage: 'clone', pct: 5 });
      await cloneRepo({ repoFullName, branch, token, cwd: jobDir, logFile });
    }

    // Run steps
    let pct = 10;
    const inc = Math.max(1, Math.floor(85 / effectiveSteps.length));
    for (const cmd of effectiveSteps) {
      await appendLog(logFile, `\n$ ${cmd}\n`);
      await job.updateProgress({ stage: 'run', pct });
      await runCmd(cmd, jobDir, env, logFile);
      pct = Math.min(95, pct + inc);
    }

    await appendLog(logFile, `\nSUCCESS at ${new Date().toISOString()}\n`);
    await job.updateProgress({ stage: 'done', pct: 100 });

    return { ok: true };
  },
  { connection, concurrency: 1 }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
worker.on('failed', async (job, err) => {
  try {
    const jobDir = path.join(JOBS_DIR, String(job.id));
    const logFile = path.join(jobDir, 'log.txt');
    await appendLog(logFile, `\nFAILED: ${err.message}\n`);
  } catch {}
  console.error(`Job ${job?.id} failed:`, err?.message);
});

console.log(`Runner started. Queue: ${queueName}`);