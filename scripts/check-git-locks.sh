#!/usr/bin/env bash
# Safely detect and optionally remove stale Git lock files.
# Usage: ./scripts/check-git-locks.sh [--force]

set -euo pipefail
FORCE=0
if [ "${1-}" = "--force" ] || [ "${1-}" = "-f" ]; then
  FORCE=1
fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
LOCKS=("$ROOT/.git/index.lock" "$ROOT/.git/HEAD.lock")
# refs locks (heads and tags)
while IFS= read -r -d '' f; do
  LOCKS+=("$f")
done < <(find "$ROOT/.git/refs" -type f -name "*.lock" -print0 2>/dev/null || true)

exists=0
for lock in "${LOCKS[@]}"; do
  if [ -e "$lock" ]; then
    exists=1
    echo "Found lock: $lock"
    ls -l "$lock" || true
    echo "Age: $(($(date +%s) - $(stat -c %Y "$lock"))) seconds"
  fi
done

if [ $exists -eq 0 ]; then
  echo "No Git lock files detected."
  exit 0
fi

# If locks exist and not forced, return non-zero so callers (like pre-commit) can abort
if [ $FORCE -ne 1 ]; then
  echo
  echo "Git lock files detected. To remove stale locks run:"
  echo "  $0 --force"
  echo "Aborting operation to avoid corrupting repository refs."
  exit 2
fi

# Check for running git processes
echo
echo "Checking for running git processes..."
if command -v pgrep >/dev/null 2>&1; then
  pgrep -a git || true
else
  ps aux | grep -i git | grep -v grep || true
fi

# If forced, ensure no git process is running before removing locks
if command -v pgrep >/dev/null 2>&1; then
  if pgrep -x git >/dev/null 2>&1; then
    echo "git process is currently running; aborting removal for safety." >&2
    exit 3
  fi
fi

for lock in "${LOCKS[@]}"; do
  if [ -e "$lock" ]; then
    echo "Removing lock: $lock"
    rm -f "$lock"
  fi
done

# Run lightweight maintenance
echo "Running git maintenance: reflog expire and gc (safe mode)"
git reflog expire --expire=now --all || true
git gc --prune=now || true
git fsck --full || true

echo "Locks removed and repo maintenance performed."
exit 0
