# DailyCodeDeploy — Automated CI/CD for Developers

**Simple, powerful, and affordable service for continuous integration and deployment.** Automate your pipelines, integrate with GitHub, and save time on development. Perfect for freelancers, startups, and teams.

🌐 **Try the demo right now:** [daily-code-deploy.github.io](https://nickscherbakov.github.io/daily-code-deploy)  
📄 **Why join the project?** [Benefits page](https://nickscherbakov.github.io/daily-code-deploy/benefits.html)  
📧 **Contact us:** n.a.scherbakov@outlook.com (or via GitHub Issues)

---

**Developed and maintained with the guidance of GitHub Copilot (Grok Code Fast 1).** 🤖

---CodeDeploy — Automated CI/CD for Developers

**Simple, powerful, and affordable service for continuous integration and deployment.** Automate your pipelines, integrate with GitHub, and save time on development. Perfect for freelancers, startups, and teams.

🌐 **Try the demo right now:** [daily-code-deploy.github.io](https://nickscherbakov.github.io/daily-code-deploy)  
� **Why join the project?** [Benefits page](https://nickscherbakov.github.io/daily-code-deploy/benefits.html)  
�📧 **Contact us:** n.a.scherbakov@outlook.com (or via GitHub Issues)

## 🚀 What is DailyCodeDeploy?

DailyCodeDeploy is a SaaS platform that simplifies CI/CD. Connect your GitHub repositories, run automated tests and deployments with simple commands. Integration with Stripe for subscriptions, Redis for queues — everything is ready to use.

### Key Benefits:
- **Easy Setup:** Launch a pipeline in minutes, without complex infrastructure.
- **GitHub Integration:** Support for public and private repositories via OAuth.
- **Scalability:** From small projects to enterprise solutions.
- **Security:** Local execution with sandboxing options.
- **Monetization:** Freemium model — free for basic features, premium for extensions.

## 🎯 Who is this for?

1. **Freelancers and Individual Developers:** Automate deployments without expensive tools.
2. **Startups:** Quick CI/CD launch to focus on the product.
3. **Small and Medium Teams:** Simple alternative to Jenkins/GitLab.
4. **Educational Institutions:** Teaching tool for learning DevOps.
5. **Open-Source Developers:** Free automation for projects.
6. **Companies:** Foundation for commercial CI/CD services.

## 💰 Pricing and Subscriptions
- **Free:** Basic pipelines, 1 repository, limited logs.
- **Pro ($49/month):** Unlimited repositories, analytics, priority support, integrations (Slack, Discord).
- **Enterprise:** Custom plans — contact us for a quote.

Subscribe via Stripe in the demo or email us!

## 📖 How to Get Started (Online Demo)
1. Visit the [demo site](https://nickscherbakov.github.io/daily-code-deploy).
2. Authenticate with GitHub.
3. Select a repository and run a pipeline.
4. For premium — sign up for a subscription.

## 🛠 Local Setup (for Developers)
If you want to run locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/NickScherbakov/daily-code-deploy.git
   cd daily-code-deploy
   ```

2. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Add STRIPE_SECRET_KEY for real payments
   ```

3. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```

4. Run:
   ```bash
   npm start  # Server at http://localhost:5000
   ```

5. For runner (with Redis):
   ```bash
   docker run --rm -p 6379:6379 redis:7-alpine
   cd backend && npm run runner
   ```

Test with curl:
```bash
curl -X POST http://localhost:5000/api/pipeline/run -H "Content-Type: application/json" -d '{"steps":["echo hello"]}'
```

## 🔧 Features and API
- **Pipelines:** Run commands, real-time logs.
- **Integrations:** GitHub OAuth, Stripe billing, Redis queue.
- **Security:** Sandboxing for execution, timeouts.
- API endpoints: `/api/pipeline/run`, `/api/repos`, `/api/billing/checkout`.

## 📈 Next Steps
- GitHub webhooks for auto-triggers.
- Database instead of JSON.
- Dashboards and analytics.
- Referral program for growth.

## 🤝 Contributions and Support
- Open source — fork and improve!
- Issues for bugs, Discussions for ideas.
- We're looking for partners — message us if you want to collaborate.

**Earn with us:** If you're a developer, join the project. For business — contact for integrations.

---

*DailyCodeDeploy — your path to efficient DevOps. Try it today!* 🚀