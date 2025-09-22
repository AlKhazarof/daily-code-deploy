# DailyCodeDeploy — Starter (demo)

This is a minimal starter repo for the "DailyCodeDeploy" idea: a subscription-backed CI/CD service skeleton. It provides a simple subscribe endpoint that persists to a local JSON file. If you configure Stripe keys, it will attempt to create real Stripe customers/subscriptions.

## Who is this for?

DailyCodeDeploy is designed for:

1. **Small and Medium Development Teams**

   - **Problem:** Lack of resources to set up complex CI/CD systems like Jenkins or GitLab CI.
   - **Solution:** A simple and accessible way to automate code building, testing, and deployment.
   - **Advantage:** Easy setup without requiring extensive infrastructure.

2. **Startups**

   - **Problem:** Need for rapid deployment and testing without spending too much time on CI/CD setup.
   - **Solution:** Quickly integrate automation for development and deployment processes.
   - **Advantage:** Saves time and resources, allowing focus on product development.

3. **Freelancers and Individual Developers**

   - **Problem:** Overhead of using complex CI/CD tools for small projects.
   - **Solution:** A minimalist tool to automate tasks like testing and deployment.
   - **Advantage:** Simple to use, no complex setup required.

4. **Educational Institutions**

   - **Problem:** Need for simple tools to teach CI/CD processes to students.
   - **Solution:** Can be used as an educational example to demonstrate CI/CD workflows.
   - **Advantage:** Straightforward architecture, easy for beginners to understand.

5. **Open-Source Developers**

   - **Problem:** Need for automation in small open-source projects without access to paid tools.
   - **Solution:** Automates processes for open-source projects.
   - **Advantage:** Free to use and customizable.

6. **Companies Offering CI/CD as a Service**

   - **Problem:** Need for a ready-to-use solution to launch CI/CD services.
   - **Solution:** Can serve as a foundation for creating a commercial product.
   - **Advantage:** Quick start and customizable for client needs.

7. **Developers Working with GitHub**

   - **Problem:** Complexity of integrating with GitHub Actions.
   - **Solution:** Simplifies automation processes using GitHub for code storage.
   - **Advantage:** Supports public and private repositories, OAuth integration.

### Key Benefits for Consumers:

- Easy to set up and use.
- Local deployment without complex infrastructure.
- Integration with popular tools like Stripe and Redis.
- Customizable for specific needs.

If you are a small team, startup, freelancer, or educator, DailyCodeDeploy offers a lightweight and efficient solution to streamline your CI/CD workflows.

---

## Quick start (local)

1. Create .env from the example:

   ```bash
   cp backend/.env.example backend/.env
   # edit backend/.env to add STRIPE_SECRET_KEY if you want real Stripe
   ```

2. Install dependencies:

   ```bash
   cd /workspaces/daily-code-deploy
   npm install
   cd backend && npm install
   # frontend is static (no build) so no deps required
   ```

3. Start the app:

   ```bash
   node backend/server.js
   # or from project root:
   npm start
   ```

4. Open the demo page:

   ```
   http://localhost:5000
   ```

## Dev notes

- In mock mode (no STRIPE_SECRET_KEY), POST /api/subscribe stores a user in backend/data/users.json.
- List users: GET /api/users
- To enable real Stripe flows: set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in backend/.env and restart.

## Test with curl

```bash
curl -s -X POST http://localhost:5000/api/subscribe -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'
curl -s http://localhost:5000/api/users
```

## Runner (queue + worker)

This starter includes a minimal CI runner using BullMQ + Redis.

### Local (no Docker)

1. Start Redis (Docker required for this step):

   ```bash
   docker run --rm -p 6379:6379 redis:7-alpine
   ```

2. Start API and Runner in separate terminals:

   - Terminal A:

     ```bash
     npm start
     ```

   - Terminal B:

     ```bash
     npm --prefix backend run runner
     # or:
     cd backend && npm run runner
     ```

3. Enqueue a demo job:

   ```bash
   curl -s -X POST http://localhost:5000/api/pipeline/run \
     -H "Content-Type: application/json" \
     -d '{"steps":["echo hi","node -v","npm -v"]}'
   ```

4. Poll status & logs:

   ```bash
   curl -s http://localhost:5000/api/pipeline/job/<JOB_ID>
   curl -s http://localhost:5000/api/pipeline/logs/<JOB_ID>
   ```

### With Docker Compose

1. docker compose up --build
2. Open http://localhost:5000 → click “Run pipeline” or use curl as above.

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