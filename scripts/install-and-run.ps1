<#
PowerShell helper to install Node (via winget/choco if available), start Redis (Docker), install dependencies, run server and runner, and perform smoke tests.

Usage (run as Administrator for installations):
  cd path\to\daily-code-deploy
  powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1 -InstallNode -StartRedis -InstallDeps -StartApp -StartRunner -SmokeTest

Notes:
- Installing Node via winget or Chocolatey may require elevated privileges.
- If no package manager is available, the script will provide manual instructions.
- Starting Docker containers requires Docker Desktop installed and running.
- The script attempts to be idempotent and reports failures.
#>

param(
  [switch]$InstallNode,
  [switch]$StartRedis,
  [switch]$InstallDeps,
  [switch]$StartApp,
  [switch]$StartRunner,
  [switch]$SmokeTest
)

function Command-Exists($cmd) {
  return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

function Install-Node {
  Write-Host "Checking for Node.js..." -ForegroundColor Cyan
  if (Command-Exists node) {
    Write-Host "Node already installed: $(node -v)" -ForegroundColor Green
    return $true
  }

  if (Command-Exists winget) {
    Write-Host "Installing Node.js LTS via winget..." -ForegroundColor Cyan
    $args = 'install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements'
    $rc = & winget $args; if ($LASTEXITCODE -ne 0) { Write-Host "winget install failed (code $LASTEXITCODE)." -ForegroundColor Red; return $false }
    Write-Host "winget install finished. You may need to open a new shell to pick up PATH changes." -ForegroundColor Green
    return (Command-Exists node)
  }

  if (Command-Exists choco) {
    Write-Host "Installing Node.js LTS via Chocolatey..." -ForegroundColor Cyan
    $rc = & choco install nodejs-lts -y; if ($LASTEXITCODE -ne 0) { Write-Host "choco install failed (code $LASTEXITCODE)." -ForegroundColor Red; return $false }
    Write-Host "choco install finished. You may need to open a new shell to pick up PATH changes." -ForegroundColor Green
    return (Command-Exists node)
  }

  Write-Host "No package manager (winget/choco) detected. Please install Node.js LTS manually: https://nodejs.org/en/download/" -ForegroundColor Yellow
  return $false
}

function Start-Redis-Docker {
  if (-not (Command-Exists docker)) {
    Write-Host "Docker is not installed or not on PATH. Install Docker Desktop to run Redis locally: https://www.docker.com/get-started" -ForegroundColor Yellow
    return $false
  }
  # Check if a container is already running
  $existing = & docker ps --filter "name=dcd-redis" --format "{{.ID}}" 2>$null
  if ($existing) {
    Write-Host "Redis container 'dcd-redis' already running." -ForegroundColor Green
    return $true
  }
  Write-Host "Starting Redis (docker run --rm -d --name dcd-redis -p 6379:6379 redis:7-alpine)" -ForegroundColor Cyan
  & docker run --rm -d --name dcd-redis -p 6379:6379 redis:7-alpine
  if ($LASTEXITCODE -ne 0) { Write-Host "Failed to start Redis via Docker." -ForegroundColor Red; return $false }
  Start-Sleep -Seconds 2
  Write-Host "Redis should be running on localhost:6379" -ForegroundColor Green
  return $true
}

function Install-Dependencies {
  Write-Host "Installing repository dependencies..." -ForegroundColor Cyan
  if (-not (Command-Exists npm)) { Write-Host "npm not found in PATH." -ForegroundColor Red; return $false }
  $root = Resolve-Path .
  Push-Location $root
  & npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Write-Host "npm install at root failed." -ForegroundColor Red; Pop-Location; return $false }
  Push-Location .\backend
  & npm install --no-audit --no-fund
  $rc = $LASTEXITCODE
  Pop-Location
  Pop-Location
  if ($rc -ne 0) { Write-Host "npm install in backend failed." -ForegroundColor Red; return $false }
  Write-Host "Dependencies installed." -ForegroundColor Green
  return $true
}

function Start-Server {
  Write-Host "Starting backend server (node backend/server.js) in background..." -ForegroundColor Cyan
  if (-not (Command-Exists node)) { Write-Host "node not found in PATH." -ForegroundColor Red; return $false }
  Push-Location (Resolve-Path .)
  $proc = Start-Process -FilePath node -ArgumentList 'backend/server.js' -WindowStyle Hidden -PassThru
  Pop-Location
  Start-Sleep -Seconds 1
  if ($proc.HasExited) { Write-Host "Server process exited immediately (code $($proc.ExitCode)). Check logs." -ForegroundColor Red; return $false }
  Write-Host "Server started (PID: $($proc.Id))." -ForegroundColor Green
  return $true
}

function Start-Runner {
  Write-Host "Starting backend runner (node backend/runner.js) in background..." -ForegroundColor Cyan
  if (-not (Command-Exists node)) { Write-Host "node not found in PATH." -ForegroundColor Red; return $false }
  Push-Location (Resolve-Path .)\backend
  $proc = Start-Process -FilePath node -ArgumentList 'runner.js' -WindowStyle Hidden -PassThru
  Pop-Location
  Start-Sleep -Seconds 1
  if ($proc.HasExited) { Write-Host "Runner process exited immediately (code $($proc.ExitCode)). Check logs." -ForegroundColor Red; return $false }
  Write-Host "Runner started (PID: $($proc.Id))." -ForegroundColor Green
  return $true
}

function Smoke-Test {
  Write-Host "Running smoke-tests against http://localhost:5000 ..." -ForegroundColor Cyan
  $base = 'http://localhost:5000'
  try {
    Write-Host "GET /health" -ForegroundColor Gray
    $h = Invoke-RestMethod "$base/health" -Method GET -ErrorAction Stop
    Write-Host "Health: $($h | ConvertTo-Json -Depth 2)" -ForegroundColor Green

    Write-Host "GET /api/pipeline/templates" -ForegroundColor Gray
    $tpl = Invoke-RestMethod "$base/api/pipeline/templates" -Method GET -ErrorAction Stop
    Write-Host "Templates: $(($tpl | Select-Object -First 3) | ConvertTo-Json -Depth 3)" -ForegroundColor Green

    Write-Host "POST /api/subscribe (mock)" -ForegroundColor Gray
    $sub = Invoke-RestMethod "$base/api/subscribe" -Method POST -ContentType 'application/json' -Body (@{ email = 'smoke+test@example.com' } | ConvertTo-Json) -ErrorAction Stop
    Write-Host "Subscribe response: $($sub | ConvertTo-Json -Depth 3)" -ForegroundColor Green

    Write-Host "GET /api/users" -ForegroundColor Gray
    $users = Invoke-RestMethod "$base/api/users" -Method GET -ErrorAction Stop
    Write-Host "Users (count): $(($users | Measure-Object).Count)" -ForegroundColor Green

    Write-Host "Enqueue demo job" -ForegroundColor Gray
    $job = Invoke-RestMethod "$base/api/pipeline/run" -Method POST -ContentType 'application/json' -Body (@{ steps = @('echo "smoke test"','node -v') } | ConvertTo-Json -Depth 5) -ErrorAction Stop
    Write-Host "Job queued: $($job | ConvertTo-Json -Depth 3)" -ForegroundColor Green

    if ($job.id) {
      Start-Sleep -Seconds 2
      Write-Host "Polling job status and logs for Job ID $($job.id)" -ForegroundColor Gray
      $status = Invoke-RestMethod "$base/api/pipeline/job/$($job.id)" -Method GET -ErrorAction SilentlyContinue
      Write-Host "Status: $(($status) | ConvertTo-Json -Depth 3)" -ForegroundColor Green
      $logs = (Invoke-RestMethod "$base/api/pipeline/logs/$($job.id)" -Method GET -ErrorAction SilentlyContinue)
      Write-Host "Logs (first 200 chars): $($logs.substring(0,[Math]::Min(200,$logs.length)))" -ForegroundColor Green
    }

    return $true
  } catch {
    Write-Host "Smoke test failed: $_" -ForegroundColor Red
    return $false
  }
}

# Main
$ok = $true
if ($InstallNode) { $ok = (Install-Node) -and $ok }
if ($StartRedis) { $ok = (Start-Redis-Docker) -and $ok }
if ($InstallDeps) { $ok = (Install-Dependencies) -and $ok }
if ($StartApp) { $ok = (Start-Server) -and $ok }
if ($StartRunner) { $ok = (Start-Runner) -and $ok }
if ($SmokeTest) { $ok = (Smoke-Test) -and $ok }

if ($ok) { Write-Host "All requested steps completed successfully." -ForegroundColor Green } else { Write-Host "One or more steps failed. Inspect above output and try manually if needed." -ForegroundColor Yellow }

exit (if ($ok) { 0 } else { 2 })
