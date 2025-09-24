<#
Setup githooks path and make sure pre-commit hook is executable on Windows.
Usage: powershell -ExecutionPolicy Bypass -File .\scripts\setup-hooks.ps1
#>

$root = (git rev-parse --show-toplevel) 2>$null
if (-not $root) { $root = Get-Location }
Set-Location $root

git config core.hooksPath .githooks

if (Test-Path .githooks\pre-commit) {
  # Ensure file is not blocked
  Unblock-File -Path .githooks\pre-commit 2>$null || $null
  Write-Host "Pre-commit hook installed to .githooks." -ForegroundColor Green
} else {
  Write-Host "Warning: .githooks\pre-commit not found. Please ensure you pulled repository files." -ForegroundColor Yellow
}

Write-Host "Run .\scripts\check-git-locks.ps1 to inspect for stale git locks. To remove stale locks (careful), run .\scripts\check-git-locks.ps1 -Force" -ForegroundColor Cyan
