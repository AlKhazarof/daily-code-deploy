const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
require('dotenv').config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeKey) {
  stripe = require('stripe')(stripeKey);
}

const PORT = process.env.PORT || 5000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
// Templates support (added)
const TEMPLATES_FILE = path.join(__dirname, 'data', 'templates.json');
const FALLBACK_TEMPLATES = [
  {
    id: 'node-smoke',
    name: 'Node.js Smoke Test',
    description: 'Install dependencies and run the default npm test script.',
    recommendedFor: ['Node.js', 'TypeScript', 'React'],
    steps: [
      "if [ -f package.json ]; then npm install; else echo 'package.json not found, skipping npm install'; fi",
      "if [ -f package.json ]; then npm test -- --watch=false || npm test; else echo 'package.json not found, skipping npm test'; fi",
    ],
    env: { CI: 'true' },
  },
  {
    id: 'python-quality',
    name: 'Python Quality Gate',
    description: 'Run linting and tests for a Python project with pytest.',
    recommendedFor: ['Python', 'Django', 'FastAPI'],
    steps: [
      'python -m pip install --upgrade pip',
      "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi",
      "if [ -f pyproject.toml ]; then pip install '.[test]' || true; fi",
      'pytest',
    ],
    env: { PYTHONUNBUFFERED: '1' },
  },
  {
    id: 'static-deploy',
    name: 'Static Site Build',
    description: 'Build a static site and prep an artifact directory for deployment.',
    recommendedFor: ['Docs', 'Landing pages', 'Vite', 'Next.js'],
    steps: [
      "if [ -f package.json ]; then npm install; else echo 'package.json not found, skipping npm install'; fi",
      "if [ -f package.json ]; then npm run build || npm run docs:build; else echo 'package.json not found, skipping build'; fi",
      'ls -R',
    ],
    env: { NODE_ENV: 'production' },
  },
];

async function readUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
}
async function writeUsers(users) {
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function readTemplates() {
  try {
    const txt = await fs.readFile(TEMPLATES_FILE, 'utf8');
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (err) {}
  return FALLBACK_TEMPLATES;
}

function sanitizeTemplate(template) {
  if (!template) return null;
  const { id, name, description, recommendedFor, env } = template;
  return {
    id,
    name,
    description,
    recommendedFor,
    hasEnv: !!(env && Object.keys(env).length),
  };
}

// Passport setup for GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/github/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    // In real app, check DB for existing user; here we store in JSON
    const users = await readUsers();
    let user = users.find(u => u.githubId === profile.id);
    if (!user) {
      user = {
        id: `gh_${profile.id}`,
        githubId: profile.id,
        email: profile.emails?.[0]?.value || profile.username + '@github.com',
        name: profile.displayName,
        username: profile.username,
        accessToken, // Store securely in prod (encrypt/hash)
        createdAt: new Date().toISOString()
      };
      users.push(user);
      await writeUsers(users);
    } else {
      user.accessToken = accessToken; // Update token
      await writeUsers(users);
    }
    return done(null, user);
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const users = await readUsers();
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// GitHub OAuth routes
if (process.env.GITHUB_CLIENT_ID) {
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));
  app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    // Issue JWT and redirect to frontend
    const token = jwt.sign({ id: req.user.id, githubId: req.user.githubId }, process.env.JWT_SECRET);
    res.redirect(`/?token=${token}`);
  });
} else {
  app.get('/auth/github', (req, res) => res.status(400).json({ error: 'GitHub OAuth not configured' }));
  app.get('/auth/github/callback', (req, res) => res.status(400).json({ error: 'GitHub OAuth not configured' }));
}

// Protected: list user's GitHub repos
app.get('/api/repos', authenticate, async (req, res) => {
  const user = await readUsers().then(users => users.find(u => u.id === req.user.id));
  if (!user?.accessToken) return res.status(401).json({ error: 'No GitHub token' });
  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: { Authorization: `token ${user.accessToken}` }
    });
    const repos = await response.json();
    res.json(repos.map(r => ({ id: r.id, name: r.name, full_name: r.full_name, private: r.private })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: list local users (for dev)
app.get('/api/users', async (req, res) => {
  const users = await readUsers();
  res.json(users);
});

// POST /api/subscribe (unchanged, but now users can be from GitHub)
app.post('/api/subscribe', async (req, res) => {
  const { email, plan = 'monthly' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  if (stripe) {
    try {
      const customer = await stripe.customers.create({ email });
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.STRIPE_PRICE_ID }],
        expand: ['latest_invoice.payment_intent']
      });
      const users = await readUsers();
      users.push({
        id: customer.id,
        email,
        stripeSubscriptionId: subscription.id,
        plan,
        createdAt: new Date().toISOString()
      });
      await writeUsers(users);
      return res.json({ ok: true, provider: 'stripe', customerId: customer.id, subscriptionId: subscription.id });
    } catch (err) {
      console.error('Stripe error', err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  } else {
    const users = await readUsers();
    const id = `local_${Date.now()}`;
    users.push({ id, email, plan, createdAt: new Date().toISOString() });
    await writeUsers(users);
    return res.json({ ok: true, provider: 'mock', id });
  }
});

// Create a Stripe Checkout session (subscription)
app.post('/api/billing/checkout', async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    // Create or reuse customer
    let customer;
    const users = await readUsers();
    let user = users.find(u => u.email === email);
    if (user?.stripeCustomerId) {
      customer = { id: user.stripeCustomerId };
    } else {
      customer = await stripe.customers.create({ email });
      if (!user) {
        user = { id: `cust_${customer.id}`, email, createdAt: new Date().toISOString() };
        users.push(user);
      }
      user.stripeCustomerId = customer.id;
      await writeUsers(users);
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return res.status(400).json({ error: 'STRIPE_PRICE_ID missing' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${PUBLIC_BASE_URL}/?checkout=success`,
      cancel_url: `${PUBLIC_BASE_URL}/?checkout=cancel`,
      allow_promotion_codes: true
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('checkout error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Webhook must use raw body for signature verification
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(400).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  (async () => {
    const users = await readUsers();
    const type = event.type;

    // Handle subscription lifecycle events
    if (type === 'checkout.session.completed') {
      const session = event.data.object;
      // session.customer, session.subscription, session.customer_details.email
      const email = session.customer_details?.email;
      if (email) {
        let u = users.find(x => x.email === email);
        if (!u) {
          u = { id: `cust_${session.customer}`, email, createdAt: new Date().toISOString() };
          users.push(u);
        }
        u.stripeCustomerId = session.customer;
        u.stripeSubscriptionId = session.subscription;
        u.subscriptionStatus = 'active'; // optimistic until invoice.paid confirms
        u.lastEvent = type;
        u.lastEventAt = new Date().toISOString();
        await writeUsers(users);
      }
    }

    if (type === 'invoice.paid') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const u = users.find(x => x.stripeCustomerId === customerId);
      if (u) {
        u.subscriptionStatus = 'active';
        u.lastPaidAt = new Date().toISOString();
        u.lastEvent = type;
        u.lastEventAt = new Date().toISOString();
        await writeUsers(users);
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const u = users.find(x => x.stripeSubscriptionId === sub.id || x.stripeCustomerId === sub.customer);
      if (u) {
        u.subscriptionStatus = sub.status; // active, past_due, canceled, etc.
        u.lastEvent = type;
        u.lastEventAt = new Date().toISOString();
        await writeUsers(users);
      }
    }
  })().catch(err => console.error('Webhook handler error', err));

  res.json({ received: true });
});

// Enqueue a pipeline run
// Body: { repoFullName?, branch?, steps?: string[], env?: Record<string,string> }
app.post('/api/pipeline/run', authenticateOptional, async (req, res) => {
  try {
    const { repoFullName, branch, steps, env, templateId } = req.body || {};

    let selectedTemplate = null;
    let finalSteps = Array.isArray(steps) ? steps.filter((s) => typeof s === 'string' && s.trim()) : [];
    let finalEnv = env && typeof env === 'object' ? { ...env } : {};

    if ((!finalSteps || !finalSteps.length) && templateId) {
      const templates = await readTemplates();
      selectedTemplate = templates.find((tpl) => tpl.id === templateId);
      if (!selectedTemplate) {
        return res.status(400).json({ error: 'template not found' });
      }
      finalSteps = Array.isArray(selectedTemplate.steps) ? selectedTemplate.steps : [];
      if (selectedTemplate.env && typeof selectedTemplate.env === 'object') {
        finalEnv = { ...selectedTemplate.env, ...finalEnv };
      }
    }

    if (!finalSteps || !finalSteps.length) {
      finalSteps = undefined; // Runner will fallback to demo steps
    }

    // Optional: require auth if repoFullName provided (for private repos/token use)
    let token;
    if (repoFullName && req.user?.id) {
      const user = await getUserById(req.user.id);
      token = user?.accessToken; // from GitHub OAuth
    }

    const queue = require('./queue').queue;
    const job = await queue.add('build', {
      repoFullName,
      branch,
      steps: finalSteps,
      env: finalEnv,
      token,
      template: sanitizeTemplate(selectedTemplate),
      templateMeta: selectedTemplate ? { id: selectedTemplate.id, name: selectedTemplate.name, stepCount: (selectedTemplate.steps||[]).length } : null,
    }, {
      removeOnComplete: 50,
      removeOnFail: 50,
      attempts: 1,
      timeout: 15 * 60 * 1000 // 15 minutes
    });

    res.json({ id: job.id, queue: require('./queue').queueName, host: require('os').hostname(), template: sanitizeTemplate(selectedTemplate) });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get job status/progress
app.get('/api/pipeline/job/:id', async (req, res) => {
  try {
    const { Queue } = require('bullmq');
    const q = new Queue(require('./queue').queueName, { connection: require('./queue').connection });
    const job = await q.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });

    const state = await job.getState(); // waiting, active, completed, failed, delayed
    const progress = job.progress;
    const returnObj = {
      id: job.id,
      name: job.name,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
    res.json(returnObj);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get logs (text)
// Note: this is a simple text file reader for demo purposes.
app.get('/api/pipeline/logs/:id', async (req, res) => {
  try {
    const logPath = path.join(__dirname, 'tmp', 'jobs', String(req.params.id), 'log.txt');
    const txt = await fs.readFile(logPath, 'utf8').catch(() => '');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(txt || 'No logs yet.');
  } catch (err) {
    res.status(500).send(err.message || String(err));
  }
});

// Optional auth: allows anonymous runs w/o repo access
function authenticateOptional(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr) return next();
  const token = hdr.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {}
  next();
}

// Helper: get user record by id
async function getUserById(id) {
  const users = await readUsers();
  return users.find(u => u.id === id);
}

// Fallback - serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DailyCodeDeploy backend listening on http://localhost:${PORT}`);
  if (!stripe) console.log('Stripe not configured — running in MOCK mode. Set STRIPE_SECRET_KEY to enable real Stripe.');
  if (!process.env.GITHUB_CLIENT_ID) console.log('GitHub OAuth not configured — set GITHUB_CLIENT_ID/SECRET to enable login.');
});