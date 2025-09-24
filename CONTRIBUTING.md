# Contributing to DailyCodeDeploy

Thanks for choosing to contribute! A few setup steps help ensure a smooth developer experience.

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/AlKhazarof/daily-code-deploy.git
cd daily-code-deploy
npm install
cd backend && npm install && cd ..
```

2. Enable Git hooks (one-time per clone):

- macOS/Linux/WSL:
  ./scripts/setup-hooks.sh

- Windows PowerShell:
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-hooks.ps1

This configures `core.hooksPath` to the repository's `.githooks` directory so the included pre-commit checks run automatically.

3. Inspect for stale Git locks (if you encounter "cannot lock ref 'HEAD'" errors):

- Unix: `./scripts/check-git-locks.sh`
- Windows PowerShell: `.\scripts\check-git-locks.ps1`

To remove stale locks (careful):

- Unix: `./scripts/check-git-locks.sh --force`
- PowerShell: `.\scripts\check-git-locks.ps1 -Force`

4. Run smoke tests locally (optional):

- Use the PowerShell helper for Windows: `powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1 -StartRedis -InstallDeps -StartApp -StartRunner -SmokeTest`
- Or run the CI smoke script in Linux/WSL: `./ci/smoke-test.sh`

5. Submit a PR with a descriptive title and link to related issue(s). Maintain test coverage where applicable.

Thanks — we appreciate contributions large and small!