# install.ps1
# Developer: Marcus Daley
# Purpose: Windows PowerShell installer for ollama-guard
# Usage: .\scripts\ollama-guard\install.ps1  (from repo root)

$ErrorActionPreference = "Stop"

$RepoRoot = git rev-parse --show-toplevel 2>$null
if (-not $RepoRoot) { $RepoRoot = (Get-Location).Path }
$RepoRoot = $RepoRoot.Trim()

$HooksDir     = Join-Path $RepoRoot ".git\hooks"
$GuardDir     = Join-Path $RepoRoot "scripts\ollama-guard"
$ConfigDest   = Join-Path $RepoRoot ".ollama-guard.yml"
$ConfigTmpl   = Join-Path $GuardDir ".ollama-guard.yml.template"
$HookFile     = Join-Path $HooksDir "pre-push"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  ollama-guard installer (Windows)"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# ── 1. Check git repo ─────────────────────────────────────────────────────────
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Host "❌ Not a git repository — run from inside a git repo"
    exit 1
}
Write-Host "✅ Git repo: $RepoRoot"

# ── 2. Check Ollama ───────────────────────────────────────────────────────────
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaPath) {
    Write-Host ""
    Write-Host "❌ Ollama is not installed."
    Write-Host "   Download from: https://ollama.com/download"
    Write-Host "   Then re-run this installer."
    exit 1
}
Write-Host "✅ Ollama: found at $($ollamaPath.Source)"

# ── 3. Read model from config ─────────────────────────────────────────────────
$Model         = "codellama:7b"
$FallbackModel = "deepseek-coder:6.7b"
if (Test-Path $ConfigDest) {
    $cfgContent = Get-Content $ConfigDest -Raw
    if ($cfgContent -match '(?m)^model:\s*"?([^\s"#]+)') { $Model = $Matches[1] }
    if ($cfgContent -match '(?m)^fallback_model:\s*"?([^\s"#]+)') { $FallbackModel = $Matches[1] }
}

# ── 4. Check / pull model ─────────────────────────────────────────────────────
$installedModels = ollama list 2>$null
if ($installedModels -notmatch [regex]::Escape($Model)) {
    Write-Host ""
    Write-Host "⚠️  Model '$Model' is not installed."
    $pullChoice = Read-Host "   Pull it now? (~4GB download) [y/N]"
    if ($pullChoice -match '^[yY]$') {
        Write-Host "   Pulling $Model..."
        ollama pull $Model
        Write-Host "✅ Model pulled: $Model"
    } else {
        Write-Host "   Checking fallback '$FallbackModel'..."
        if ($installedModels -notmatch [regex]::Escape($FallbackModel)) {
            $pullFb = Read-Host "   Pull fallback '$FallbackModel'? [y/N]"
            if ($pullFb -match '^[yY]$') {
                ollama pull $FallbackModel
                Write-Host "✅ Fallback pulled: $FallbackModel"
            } else {
                Write-Host "⚠️  No model available — guard will skip until a model is installed"
            }
        } else {
            Write-Host "✅ Fallback already installed: $FallbackModel"
        }
    }
} else {
    Write-Host "✅ Model: $Model (installed)"
}

# ── 5. Copy config template ───────────────────────────────────────────────────
if (-not (Test-Path $ConfigDest)) {
    if (Test-Path $ConfigTmpl) {
        Copy-Item $ConfigTmpl $ConfigDest
        Write-Host "✅ Config created: .ollama-guard.yml"
    } else {
        Write-Host "⚠️  Config template not found — copy .ollama-guard.yml.template manually"
    }
} else {
    Write-Host "✅ Config: .ollama-guard.yml (exists — not overwritten)"
}

# ── 6. Install pre-push hook ──────────────────────────────────────────────────
# Git hooks on Windows run via Git Bash, so we write a bash script
$hookContent = @"
#!/usr/bin/env bash
# pre-push hook managed by ollama-guard
# Developer: Marcus Daley
"$($GuardDir.Replace('\','/'))/pre-push.sh" "`$@"
"@

if (Test-Path $HookFile) {
    $existing = Get-Content $HookFile -Raw
    if ($existing -match "ollama-guard") {
        Write-Host "✅ pre-push hook: already installed"
    } else {
        Add-Content $HookFile "`n# ollama-guard`n`"$($GuardDir.Replace('\','/'))/pre-push.sh`" `"`$@`""
        Write-Host "✅ pre-push hook: appended to existing hook"
    }
} else {
    Set-Content -Path $HookFile -Value $hookContent -Encoding utf8
    Write-Host "✅ pre-push hook: installed"
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  ✅ ollama-guard installed (Windows)"
Write-Host ""
Write-Host "  Next push will run the error check."
Write-Host "  Edit .ollama-guard.yml to customize."
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
