# 🚀 DailyCodeDeploy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![CI & Deploy](https://github.com/AlKhazarof/daily-code-deploy/actions/workflows/deploy.yml/badge.svg)](https://github.com/AlKhazarof/daily-code-deploy/actions/workflows/deploy.yml)
[![Weekly Lock Check](https://github.com/AlKhazarof/daily-code-deploy/actions/workflows/check-locks.yml/badge.svg)](https://github.com/AlKhazarof/daily-code-deploy/actions/workflows/check-locks.yml)

DailyCodeDeploy is an open-source platform that democratizes DevOps. Our mission is to make deployment automation simple and accessible to developers of all levels.

Why it’s exciting:
- Template marketplace: curated, copy-editable pipelines tuned for popular stacks.
- Instant GitHub onboarding: OAuth login pulls your repos so you can clone private code securely.
- Stripe-ready billing: mock mode out-of-the-box, live mode with environment variables.

## Developer setup

To help prevent the "cannot lock ref 'HEAD'" error and other git ref issues, the repository includes helper scripts and a pre-commit hook that detects stale git lock files.

1. Install local hooks (recommended):
   - Unix/macOS/WSL: `./scripts/setup-hooks.sh`
   - Windows PowerShell (run as user): `powershell -ExecutionPolicy Bypass -File .\scripts\setup-hooks.ps1`

   These scripts configure `core.hooksPath` to `.githooks` and make the pre-commit hook active for your clone.

2. Inspect and remove stale lock files:
   - Inspect: `./scripts/check-git-locks.sh` or `.\scripts\check-git-locks.ps1`
   - Remove stale locks (careful): `./scripts/check-git-locks.sh --force` or `.\scripts\check-git-locks.ps1 -Force`

   The scripts will refuse to remove locks if a git process is currently running to avoid corrupting repository state.

3. CI & automation

- A weekly GitHub Action (`.github/workflows/check-locks.yml`) runs the lock-check script and uploads a small report as an artifact. This helps repository maintainers detect recurring lock issues early.

Note: If the pre-commit hook blocks you, ensure no other git processes are running and run the check scripts to diagnose and remove stale locks safely.

## Quick start (local)

1. Create .env from the example:
   cp backend/.env.example backend/.env
   # edit backend/.env to add STRIPE_SECRET_KEY if you want real Stripe

2. Install dependencies:
   cd /workspaces/daily-code-deploy
   npm install
   cd backend && npm install
   # frontend is static (no build) so no deps required

3. Start the app:
   node backend/server.js
   # or from project root:
   npm start

4. Open the demo page:
   http://localhost:5000

5. (Optional) Start the queue worker for pipelines:
   cd backend && npm run runner

## New: Pipeline templates

Templates live in `backend/data/templates.json`. Each entry exposes:
- `id`, `name`, `description`
- `recommendedFor` tags for quick discovery
- `steps`: shell commands executed in BullMQ worker
- optional `env` overrides merged into the job

The frontend fetches `/api/pipeline/templates`, renders cards, and lets users queue jobs with a single click. Jobs log template metadata so teammates can replay or remix popular flows. Community contributions to `backend/data/templates.json` are welcome.

## Dev notes
- In mock mode (no STRIPE_SECRET_KEY), POST /api/subscribe stores a user in backend/data/users.json.
- List users: GET /api/users
- To enable real Stripe flows: set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in backend/.env and restart.
- Templates endpoint: GET /api/pipeline/templates

## Test with curl
```
curl -s -X POST http://localhost:5000/api/subscribe -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'
curl -s http://localhost:5000/api/users
```

## Runner (queue + worker)

This starter includes a minimal CI runner using BullMQ + Redis.

### Local (no Docker)

1) Start Redis (Docker required for this step):
   docker run --rm -p 6379:6379 redis:7-alpine

2) Start API and Runner in separate terminals:
   # Terminal A
   npm start
   # Terminal B
   npm --prefix backend run runner
   # or: cd backend && npm run runner

3) Enqueue a demo job (template-aware):
   curl -s -X POST http://localhost:5000/api/pipeline/run \
     -H "Content-Type: application/json" \
     -d '{"templateId":"node-smoke","repoFullName":"OWNER/REPO"}'

4) Poll status & logs:
   curl -s http://localhost:5000/api/pipeline/job/<JOB_ID>
   curl -s http://localhost:5000/api/pipeline/logs/<JOB_ID>

### With Docker Compose
1) docker compose up --build
2) Open http://localhost:5000 → click “Run pipeline” or use curl as above.

### Cloning a repo
- If you’re logged in with GitHub (via the landing page → Login with GitHub), enter owner/name and optional branch, then “Run pipeline”. Private repos require stored OAuth token (already saved after login).
- Public repos work without login if the repo is public.
- Jobs now log the template used, making it easy to audit or replay.

### Notes
- This is a demo runner; it executes shell commands provided by the request. In production, lock this down:
  - Only run whitelisted steps defined in per-repo config.
  - Sandbox job execution (ephemeral containers, user namespaces).
  - Resource limits and timeouts.
- Logs are written to backend/tmp/jobs/<jobId>/log.txt

## Growth roadmap ideas
- Launch community template gallery (PRs welcome in `backend/data/templates.json`).
- Add GitHub webhooks for push-triggered builds.
- Replace local storage with a durable DB (Postgres/Mongo).
- Implement user dashboards, pipeline history, and billing analytics.
- Introduce referral program, Zapier integration, and weekly digests.
- Provide AI-assisted pipeline authoring and step suggestions.

## Monetization note
- If you price at $10/month, to hit $100/day (~$3k/month), you need ~300 paying monthly subscribers. Consider enterprise plans, add-ons, or usage-based billing to increase ARPU and reduce required user count.

## Architecture and features

```
Frontend: HTML5, CSS3, Vanilla JavaScript
Backend: Node.js, Express.js
Queue: BullMQ + Redis
Integrations: GitHub API, Stripe
```

## Contact and contribution

- GitHub issues and PRs are welcome. Add templates via PR to `backend/data/templates.json`.
- For discussions, use the repository's Issues/Discussions.

---

**🎆 Join Our Mission:** Make DevOps simple, accessible, and understandable for everyone! 🚀

*DailyCodeDeploy is not just a tool, it's a community of developers creating the future of development automation.*
