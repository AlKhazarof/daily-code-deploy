<#
Check for stale Git lock files and optionally remove them.
Usage: .\scripts\check-git-locks.ps1 [-Force]

- Shows any lock files under .git and their ages.
- If -Force is provided, verifies no running git processes and removes locks, then runs lightweight maintenance.
#>
param(
  [switch]$Force
)

function Get-LockFiles {
  $root = (git rev-parse --show-toplevel) 2>$null
  if (-not $root) { $root = Get-Location }
  $gitDir = Join-Path $root '.git'
  $patterns = @('index.lock','HEAD.lock')
  $files = @()
  foreach ($p in $patterns) {
    $f = Join-Path $gitDir $p
    if (Test-Path $f) { $files += (Get-Item $f) }
  }
  # refs locks
  $refs = Join-Path $gitDir 'refs'
  if (Test-Path $refs) {
    $files += Get-ChildItem -Path $refs -Filter *.lock -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $_ }
  }
  return $files
}

$locks = Get-LockFiles
if (-not $locks -or $locks.Count -eq 0) {
  Write-Host "No Git lock files detected." -ForegroundColor Green
  exit 0
}

Write-Host "Found the following Git lock files:" -ForegroundColor Yellow
foreach ($l in $locks) {
  $age = [int]((Get-Date) - $l.LastWriteTime).TotalSeconds
  Write-Host "$($l.FullName) — Age: ${age}s — Size: $($l.Length) bytes"
}

# Show running git processes
Write-Host "\nChecking for running git processes..." -ForegroundColor Cyan
$gitProcs = Get-Process -Name git -ErrorAction SilentlyContinue
if ($gitProcs) {
  Write-Host "Git processes currently running:" -ForegroundColor Yellow
  $gitProcs | Format-Table Id, ProcessName, StartTime -AutoSize
} else {
  Write-Host "No git processes detected." -ForegroundColor Green
}

if (-not $Force) {
  Write-Host "\nNo changes made. To remove locks run this script with -Force (ensuring no git processes are running)." -ForegroundColor Yellow
  exit 0
}

if ($gitProcs) {
  Write-Host "Aborting: git processes are running. Stop them before forcing removal." -ForegroundColor Red
  exit 2
}

# Remove locks
foreach ($l in $locks) {
  try {
    Remove-Item -LiteralPath $l.FullName -Force
    Write-Host "Removed $($l.FullName)" -ForegroundColor Green
  } catch {
    Write-Host "Failed to remove $($l.FullName): $_" -ForegroundColor Red
  }
}

Write-Host "Running git maintenance (reflog expire & gc)..." -ForegroundColor Cyan
git reflog expire --expire=now --all 2>$null
git gc --prune=now 2>$null
Write-Host "Maintenance complete." -ForegroundColor Green
exit 0
