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
$ModelCatalog = Join-Path $GuardDir "model-catalog.txt"
$HookFile     = Join-Path $HooksDir "pre-push"

Write-Host ""
Write-Host "-------------------------------------------"
Write-Host "  ollama-guard installer (Windows)"
Write-Host "-------------------------------------------"
Write-Host ""

# -- 1. Check git repo --------------------------------------------------------
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Host "[FAIL] Not a git repository -- run from inside a git repo"
    exit 1
}
Write-Host "[OK] Git repo: $RepoRoot"

# -- 2. Check Ollama ----------------------------------------------------------
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaPath) {
    Write-Host ""
    Write-Host "[FAIL] Ollama is not installed."
    Write-Host "   Download from: https://ollama.com/download"
    Write-Host "   Then re-run this installer."
    exit 1
}
Write-Host "[OK] Ollama: found at $($ollamaPath.Source)"

# -- 3. Read model from config ------------------------------------------------
$Model         = ""
$FallbackModel = ""
if (Test-Path $ConfigDest) {
    $cfgContent = Get-Content $ConfigDest -Raw
    if ($cfgContent -match '(?m)^model:\s*"?([^\s"#]+)') { $Model = $Matches[1] }
    if ($cfgContent -match '(?m)^fallback_model:\s*"?([^\s"#]+)') { $FallbackModel = $Matches[1] }
}

# -- 4. Check / pull model ----------------------------------------------------
function Get-InstalledOllamaModels {
    $rows = (& ollama list 2>$null) | Select-Object -Skip 1
    return @($rows | ForEach-Object {
        ($_ -split '\s+')[0]
    } | Where-Object { $_ })
}

function Test-ModelInstalled {
    param([string]$Name, [string[]]$Installed)
    return -not [string]::IsNullOrWhiteSpace($Name) -and $Installed -contains $Name
}

function Get-ModelCatalog {
    if (Test-Path $ModelCatalog) {
        return @(Get-Content $ModelCatalog | Where-Object {
            $_ -and ($_ -notmatch '^\s*#')
        })
    }
    return @("codellama:7b", "deepseek-coder:6.7b", "codellama:13b", "llama3:8b", "qwen2.5-coder:7b", "llama3.1:8b")
}

function Install-ModelFromCatalog {
    $catalog = @(Get-ModelCatalog)
    Write-Host ""
    Write-Host "No Ollama models are installed. Pick a model to install:"
    for ($i = 0; $i -lt $catalog.Count; $i++) {
        "{0,3}) {1}" -f ($i + 1), $catalog[$i] | Write-Host
    }
    $choice = Read-Host "Select a number, enter a model tag, or press Enter to skip"
    if ([string]::IsNullOrWhiteSpace($choice)) { return }

    $selected = $choice
    $choiceNumber = 0
    if ([int]::TryParse($choice, [ref]$choiceNumber) -and $choiceNumber -ge 1 -and $choiceNumber -le $catalog.Count) {
        $selected = $catalog[$choiceNumber - 1]
    }

    Write-Host "Pulling $selected..."
    ollama pull $selected
    Write-Host "[OK] Installed model: $selected"
}

$installedModels = @(Get-InstalledOllamaModels)
if ($installedModels.Count -eq 0) {
    Install-ModelFromCatalog
} elseif (Test-ModelInstalled $Model $installedModels) {
    Write-Host "[OK] Using configured model: $Model"
} elseif (Test-ModelInstalled $FallbackModel $installedModels) {
    Write-Host "[OK] Using configured fallback model: $FallbackModel"
} else {
    Write-Host "[OK] Configured model is not installed; any local model is accepted."
    Write-Host "[OK] Using installed model: $($installedModels[0])"
}

# -- 5. Copy config template --------------------------------------------------
if (-not (Test-Path $ConfigDest)) {
    if (Test-Path $ConfigTmpl) {
        Copy-Item $ConfigTmpl $ConfigDest
        Write-Host "[OK] Config created: .ollama-guard.yml"
    } else {
        Write-Host "[WARN] Config template not found -- copy .ollama-guard.yml.template manually"
    }
} else {
    Write-Host "[OK] Config: .ollama-guard.yml (exists -- not overwritten)"
}

# -- 6. Install pre-push hook -------------------------------------------------
# Git hooks on Windows run via Git Bash, so we write a bash script
$GuardDirFwd = $GuardDir.Replace('\','/')
$hookContent = @"
#!/usr/bin/env bash
# pre-push hook managed by ollama-guard
# Developer: Marcus Daley
"$GuardDirFwd/pre-push.sh" "`$@"
"@

if (Test-Path $HookFile) {
    $existing = Get-Content $HookFile -Raw
    if ($existing -match "ollama-guard") {
        Write-Host "[OK] pre-push hook: already installed"
    } else {
        Add-Content $HookFile "`n# ollama-guard`n`"$GuardDirFwd/pre-push.sh`" `"`$@`""
        Write-Host "[OK] pre-push hook: appended to existing hook"
    }
} else {
    Set-Content -Path $HookFile -Value $hookContent -Encoding utf8
    Write-Host "[OK] pre-push hook: installed"
}

# -- Done ---------------------------------------------------------------------
Write-Host ""
Write-Host "-------------------------------------------"
Write-Host "  [OK] ollama-guard installed (Windows)"
Write-Host ""
Write-Host "  Next push will run the error check."
Write-Host "  Edit .ollama-guard.yml to customize."
Write-Host "-------------------------------------------"
Write-Host ""
