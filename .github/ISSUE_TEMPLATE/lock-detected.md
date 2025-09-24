---
name: Git lock files detected
about: Use this template when the weekly lock-check CI found git lock files in the repository.
---

**What happened**
The automated weekly lock-check workflow detected one or more Git lock files in the repository. This can be caused by interrupted Git operations or unusual environment setups.

**Logs**
Please paste the `git-locks-report` artifact contents or relevant log excerpt.

**Suggested actions**
- Inspect and, if necessary, remove lock files using `./scripts/check-git-locks.sh --force` (Unix) or `./scripts/check-git-locks.ps1 -Force` (Windows), *only if no git processes are running*.
- Verify that CI or other automation systems are not creating lock files repeatedly.

**Environment**
- CI run id: 
- Commit / branch: 

**Assignment**
/assign @maintainers
