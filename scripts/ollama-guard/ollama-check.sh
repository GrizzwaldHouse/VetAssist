#!/usr/bin/env bash
# ollama-check.sh
# Developer: Marcus Daley
# Purpose: Core analysis engine — collects errors, calls Ollama, returns patch
# Called by both pre-push.sh (local) and the CI action (non-interactive)
# Usage: ./ollama-check.sh [--ci] [--dry-run]
# Exit codes: 0=no errors, 1=errors found+fixed, 2=errors found+unfixable, 3=ollama unavailable

set -euo pipefail

# ── Config loading ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONFIG_FILE="$REPO_ROOT/.ollama-guard.yml"

# Defaults (overridden by .ollama-guard.yml)
MODEL=""
FALLBACK_MODEL=""
TIMEOUT=30
DRY_RUN=false
CHECK_TS=true
CHECK_ESLINT=true
CHECK_TESTS=true

# Parse .ollama-guard.yml with basic key: value extraction (no yq dependency)
if [[ -f "$CONFIG_FILE" ]]; then
  _read_cfg() { grep -E "^$1:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g;s/ *$//' || true; }
  _val=$(  _read_cfg model);           [[ -n "$_val" ]] && MODEL="$_val"
  _val=$(_read_cfg fallback_model);    [[ -n "$_val" ]] && FALLBACK_MODEL="$_val"
  _val=$(_read_cfg timeout_seconds);   [[ -n "$_val" ]] && TIMEOUT="$_val"
  _val=$(_read_cfg dry_run);           [[ "$_val" == "true" ]] && DRY_RUN=true
  # error_types block
  grep -E "^  typescript: false" "$CONFIG_FILE" &>/dev/null && CHECK_TS=false || true
  grep -E "^  eslint: false"     "$CONFIG_FILE" &>/dev/null && CHECK_ESLINT=false || true
  grep -E "^  tests: false"      "$CONFIG_FILE" &>/dev/null && CHECK_TESTS=false || true
fi

# ── Flags ─────────────────────────────────────────────────────────────────────
CI_MODE=false
[[ "${1:-}" == "--ci" ]] && CI_MODE=true
[[ "${2:-}" == "--dry-run" || "${1:-}" == "--dry-run" ]] && DRY_RUN=true

PATCH_FILE="$REPO_ROOT/.ollama-guard-patch.diff"
SUMMARY_FILE="$REPO_ROOT/.ollama-guard-summary.txt"
rm -f "$PATCH_FILE" "$SUMMARY_FILE"

# ── Ollama availability check ─────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo "⚠️  ollama not found — skipping error check" >&2
  exit 3
fi

installed_models() {
  ollama list 2>/dev/null | awk 'NR > 1 && $1 != "" { print $1 }'
}

model_is_installed() {
  local model="$1"
  [[ -n "$model" ]] && installed_models | grep -Fxq "$model"
}

if model_is_installed "$MODEL"; then
  :
elif model_is_installed "$FALLBACK_MODEL"; then
  echo "Configured model is not installed; using fallback $FALLBACK_MODEL" >&2
  MODEL="$FALLBACK_MODEL"
else
  MODEL="$(installed_models | head -1)"
  if [[ -z "$MODEL" ]]; then
    echo "No Ollama models are installed. Run scripts/ollama-guard/install.sh or install a model with ollama pull <model>." >&2
    exit 3
  fi
  echo "Configured model is not installed; using available model $MODEL" >&2
fi

# ── Error collection ──────────────────────────────────────────────────────────
ERRORS=""
cd "$REPO_ROOT"

has_npm_script() {
  local script_name="$1"
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1)" "$script_name" 2>/dev/null
}

collect_ts_errors() {
  local out
  if has_npm_script typecheck; then
    if ! out=$(npm run typecheck 2>&1); then
      ERRORS+=$'\n\n### TypeScript errors\n'"$out"
    fi
  else
    if ! out=$(npx tsc --noEmit 2>&1); then
      ERRORS+=$'\n\n### TypeScript errors\n'"$out"
    fi
  fi
}

collect_eslint_errors() {
  local out
  if has_npm_script lint; then
    if ! out=$(npm run lint 2>&1); then
      if echo "$out" | grep -q "ESLint couldn't find an eslint.config"; then
        echo "ollama-guard: lint skipped because ESLint is not configured for this repo." >&2
        return 0
      fi
      ERRORS+=$'\n\n### ESLint errors\n'"$out"
    fi
  else
    if ! out=$(npx eslint . --max-warnings 0 2>&1); then
      if echo "$out" | grep -q "ESLint couldn't find an eslint.config"; then
        echo "ollama-guard: lint skipped because ESLint is not configured for this repo." >&2
        return 0
      fi
      ERRORS+=$'\n\n### ESLint errors\n'"$out"
    fi
  fi
}

collect_test_errors() {
  local out
  if has_npm_script test; then
    if ! out=$(npm test 2>&1); then
      if echo "$out" | grep -q "No test files found" && ! echo "$out" | grep -qE "FAIL|AssertionError"; then
        echo "ollama-guard: tests skipped because configured test packages contain no discovered tests." >&2
        return 0
      fi
      ERRORS+=$'\n\n### Test failures\n'"$out"
    fi
  elif grep -q '"vitest"' package.json 2>/dev/null; then
    if ! out=$(npx vitest run --reporter=verbose 2>&1); then
      if echo "$out" | grep -q "No test files found" && ! echo "$out" | grep -qE "FAIL|AssertionError"; then
        echo "ollama-guard: tests skipped because no tests were discovered." >&2
        return 0
      fi
      ERRORS+=$'\n\n### Test failures\n'"$out"
    fi
  else
    if ! out=$(npm test -- --passWithNoTests 2>&1); then
      ERRORS+=$'\n\n### Test failures\n'"$out"
    fi
  fi
}

[[ "$CHECK_TS"     == "true" ]] && collect_ts_errors
[[ "$CHECK_ESLINT" == "true" ]] && collect_eslint_errors
[[ "$CHECK_TESTS"  == "true" ]] && collect_test_errors

if [[ -z "$ERRORS" ]]; then
  echo "✅ No errors found"
  exit 0
fi

# ── Build Ollama prompt ───────────────────────────────────────────────────────
# Capture current file contents for context (only files mentioned in errors)
MENTIONED_FILES=$(echo "$ERRORS" | grep -oE '[a-zA-Z0-9_./\-]+\.(ts|tsx|js|jsx)' | sort -u | head -10 || true)
FILE_CONTEXT=""
for f in $MENTIONED_FILES; do
  if [[ -f "$REPO_ROOT/$f" ]]; then
    FILE_CONTEXT+=$'\n\n### File: '"$f"$'\n```\n'
    FILE_CONTEXT+=$(head -100 "$REPO_ROOT/$f")
    FILE_CONTEXT+=$'\n```'
  fi
done

PROMPT="You are a TypeScript/JavaScript code repair tool. You will be given build errors and the relevant source files. Your job is to produce a unified diff patch that fixes ONLY the reported errors — do not refactor, do not add features, do not change logic.

Rules:
- Output ONLY a unified diff (--- a/file +++ b/file format), nothing else
- If you cannot fix an error with confidence, output: UNFIXABLE: <reason>
- Do not add comments explaining the fix
- Do not change imports unless the error is an import error
- Preserve all existing file headers and coding style

## Errors to fix:
$ERRORS

## Relevant source files:
$FILE_CONTEXT

## Output (unified diff only):"

# ── Call Ollama ───────────────────────────────────────────────────────────────
echo "🤖 Calling $MODEL to analyze errors..."
OLLAMA_RESPONSE=$(timeout "$TIMEOUT" ollama run "$MODEL" "$PROMPT" 2>&1 || echo "TIMEOUT")

if [[ "$OLLAMA_RESPONSE" == "TIMEOUT" ]]; then
  echo "⏱  Ollama timed out after ${TIMEOUT}s — skipping fix" >&2
  exit 3
fi

if echo "$OLLAMA_RESPONSE" | grep -q "^UNFIXABLE:"; then
  REASON=$(echo "$OLLAMA_RESPONSE" | grep "^UNFIXABLE:" | head -1)
  echo "$REASON" > "$SUMMARY_FILE"
  echo "⚠️  $REASON"
  # Still write the error list so the caller can display it
  echo "$ERRORS" >> "$SUMMARY_FILE"
  exit 2
fi

# ── Extract and validate the patch ───────────────────────────────────────────
# Pull only lines that look like a unified diff
PATCH=$(echo "$OLLAMA_RESPONSE" | awk '/^--- /,0' | head -200)

if [[ -z "$PATCH" ]]; then
  echo "⚠️  Ollama returned no patch — errors may need manual review" >&2
  echo "$ERRORS" > "$SUMMARY_FILE"
  exit 2
fi

echo "$PATCH" > "$PATCH_FILE"

# Count changed lines (additions + deletions, excluding diff headers)
CHANGED_LINES=$(echo "$PATCH" | grep -cE '^[+-][^+-]' || echo "0")
echo "$CHANGED_LINES" > "$REPO_ROOT/.ollama-guard-linecount.txt"

# ── Dry run: just report ──────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "── Dry run diff ──────────────────────────────────────"
  echo "$PATCH"
  echo "──────────────────────────────────────────────────────"
  echo "Changed lines: $CHANGED_LINES"
  exit 1
fi

echo "Found $CHANGED_LINES changed lines in proposed fix."
echo "Patch written to: $PATCH_FILE"
exit 1  # 1 = errors found, patch ready for caller to apply
