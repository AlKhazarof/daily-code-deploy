#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
cd "$ROOT"

# Configure hooks path
git config core.hooksPath .githooks

# Ensure pre-commit is executable
if [ -f ".githooks/pre-commit" ]; then
  chmod +x .githooks/pre-commit || true
  echo "Pre-commit hook installed to .githooks and made executable."
else
  echo "Warning: .githooks/pre-commit not found. Please ensure you pulled repository files."
fi

echo "Run './scripts/check-git-locks.sh' to inspect for stale git locks. To remove stale locks (careful), run './scripts/check-git-locks.sh --force'"