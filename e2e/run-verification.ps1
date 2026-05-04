# run-verification.ps1
# Developer: Marcus Daley
# Date: 2026-05-03
# Purpose: Start dev server, run Playwright phase verification, stop server

param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$Headed,
  [switch]$SkipServerStart
)

$ErrorActionPreference = "Stop"
$RepoRoot = git rev-parse --show-toplevel
$RepoRoot = $RepoRoot.Trim()

Write-Host ""
Write-Host "-------------------------------------------"
Write-Host "  VetAssist Phase Verification"
Write-Host "-------------------------------------------"
Write-Host ""

# -- 1. Start dev server if not already running --------------------------------
$serverProcess = $null
if (-not $SkipServerStart) {
  Write-Host "[INFO] Starting dev server..."
  $serverProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $RepoRoot `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput "$RepoRoot\e2e\server.log" `
    -RedirectStandardError "$RepoRoot\e2e\server-err.log"

  # Wait for server to be ready
  $maxWait = 60
  $elapsed = 0
  Write-Host "[INFO] Waiting for server on $BaseUrl ..."
  while ($elapsed -lt $maxWait) {
    try {
      $null = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      Write-Host "[OK] Server is up"
      break
    } catch {
      Start-Sleep -Seconds 2
      $elapsed += 2
    }
  }
  if ($elapsed -ge $maxWait) {
    Write-Host "[FAIL] Server did not start in ${maxWait}s"
    if ($serverProcess) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
  }
}

# -- 2. Run Playwright ---------------------------------------------------------
$playwrightArgs = @("playwright", "test", "e2e/phase-verification.spec.ts")
if ($Headed) { $playwrightArgs += "--headed" }

Write-Host ""
Write-Host "[INFO] Running Playwright E2E verification..."
Write-Host ""

$env:PLAYWRIGHT_BASE_URL = $BaseUrl
$result = & npx @playwrightArgs
$exitCode = $LASTEXITCODE

# -- 3. Stop dev server --------------------------------------------------------
if ($serverProcess -and -not $serverProcess.HasExited) {
  Write-Host ""
  Write-Host "[INFO] Stopping dev server..."
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}

# -- 4. Report -----------------------------------------------------------------
Write-Host ""
if ($exitCode -eq 0) {
  Write-Host "-------------------------------------------"
  Write-Host "  [PASS] Phase verification complete"
  Write-Host "  Safe to push."
  Write-Host "-------------------------------------------"
} else {
  Write-Host "-------------------------------------------"
  Write-Host "  [FAIL] Verification failed -- do not push"
  Write-Host "  Review: e2e/reports/index.html"
  Write-Host "-------------------------------------------"
}
Write-Host ""

exit $exitCode
