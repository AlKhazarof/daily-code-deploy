# DailyCodeDeploy — Starter (demo)

This is a minimal starter repo for the "DailyCodeDeploy" idea: a subscription-backed CI/CD service skeleton. It provides a simple subscribe endpoint that persists to a local JSON file. If you configure Stripe keys, it will attempt to create real Stripe customers/subscriptions.

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

## Dev notes
- In mock mode (no STRIPE_SECRET_KEY), POST /api/subscribe stores a user in backend/data/users.json.
- List users: GET /api/users
- To enable real Stripe flows: set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in backend/.env and restart.

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

3) Enqueue a demo job:
   curl -s -X POST http://localhost:5000/api/pipeline/run \
     -H "Content-Type: application/json" \
     -d '{"steps":["echo hi","node -v","npm -v"]}'

4) Poll status & logs:
   curl -s http://localhost:5000/api/pipeline/job/<JOB_ID>
   curl -s http://localhost:5000/api/pipeline/logs/<JOB_ID>

### With Docker Compose
1) docker compose up --build
2) Open http://localhost:5000 → click “Run pipeline” or use curl as above.

### Cloning a repo
- If you’re logged in with GitHub (via the landing page → Login with GitHub), enter owner/name and optional branch, then “Run pipeline”. Private repos require stored OAuth token (already saved after login).
- Public repos work without login if the repo is public.

### Notes
- This is a demo runner; it executes shell commands provided by the request. In production, lock this down:
  - Only run whitelisted steps defined in per-repo config.
  - Sandbox job execution (ephemeral containers, user namespaces).
  - Resource limits and timeouts.
- Logs are written to backend/tmp/jobs/<jobId>/log.txt

## Next steps (recommended)
- Add GitHub webhooks for push-triggered builds.
- Replace local storage with a durable DB (Postgres/Mongo).
- Implement user dashboards, pipeline history, and billing analytics.
- Add referral program and marketing landing page.

## Monetization note
- If you price at $10/month, to hit $100/day (~$3k/month), you need ~300 paying monthly subscribers. Consider enterprise plans, add-ons, or usage-based billing to increase ARPU and reduce required user count.