# Makefile: cross-platform helpers. For Windows PowerShell users use the provided scripts.
.PHONY: install-hooks check-locks smoke ci-run

install-hooks:
	@sh scripts/setup-hooks.sh || powershell -ExecutionPolicy Bypass -File scripts/setup-hooks.ps1

check-locks:
	@sh scripts/check-git-locks.sh || powershell -ExecutionPolicy Bypass -File scripts/check-git-locks.ps1

smoke:
	@sh ci/smoke-test.sh

ci-run:
	@npm install && (cd backend && npm ci)
	@$(MAKE) smoke
