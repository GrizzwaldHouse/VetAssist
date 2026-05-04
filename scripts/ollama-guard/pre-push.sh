#!/usr/bin/env bash
# pre-push.sh
# Developer: Marcus Daley
# Purpose: Interactive pre-push hook — runs ollama-check, shows diff, prompts user
# Installed to .git/hooks/pre-push by install.sh
# Runs ONLY on git push — not on every commit

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
GUARD_SCRIPT="$SCRIPT_DIR/ollama-check.sh"
CONFIG_FILE="$REPO_ROOT/.ollama-guard.yml"
PATCH_FILE="$REPO_ROOT/.ollama-guard-patch.diff"
LINECOUNT_FILE="$REPO_ROOT/.ollama-guard-linecount.txt"
SUMMARY_FILE="$REPO_ROOT/.ollama-guard-summary.txt"

# Read commit pattern from config
LOCAL_COMMIT_PATTERN="fix(ollama-local): %s"
if [[ -f "$CONFIG_FILE" ]]; then
  _val=$(grep -E "^local_commit_pattern:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g' || true)
  [[ -n "$_val" ]] && LOCAL_COMMIT_PATTERN="$_val"
fi

cleanup() {
  rm -f "$PATCH_FILE" "$LINECOUNT_FILE" "$SUMMARY_FILE"
}
trap cleanup EXIT

# ── Run the core analysis ─────────────────────────────────────────────────────
echo ""
echo "🔍 ollama-guard: checking for errors before push..."
echo ""

EXIT_CODE=0
"$GUARD_SCRIPT" || EXIT_CODE=$?

case $EXIT_CODE in
  0)
    # No errors — proceed
    echo ""
    exit 0
    ;;
  3)
    # Ollama unavailable — warn but allow push
    echo "⚠️  ollama-guard skipped (ollama unavailable) — push proceeding"
    echo ""
    exit 0
    ;;
  2)
    # Errors found but Ollama couldn't auto-fix
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  Errors found — Ollama could not generate a safe fix"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    if [[ -f "$SUMMARY_FILE" ]]; then
      cat "$SUMMARY_FILE"
    fi
    echo ""
    # Open interactive terminal for decision (works on Windows via Git Bash)
    exec < /dev/tty
    printf "What would you like to do?\n  [s]kip — push anyway (CI will catch it)\n  [A]bort — abort the push\n\nChoice [s/A]: "
    read -r CHOICE < /dev/tty
    case "${CHOICE:-A}" in
      s|S) echo "⚠️  Pushing with known errors — CI will flag them"; exit 0 ;;
      *)   echo "🚫 Push aborted"; exit 1 ;;
    esac
    ;;
  1)
    # Errors found + patch ready
    if [[ ! -f "$PATCH_FILE" ]]; then
      echo "⚠️  Patch file missing — skipping fix, push proceeding"
      exit 0
    fi

    CHANGED_LINES=0
    [[ -f "$LINECOUNT_FILE" ]] && CHANGED_LINES=$(cat "$LINECOUNT_FILE")

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 ollama-guard found errors and proposed a fix"
    echo "   Changed lines: $CHANGED_LINES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "── Proposed diff ────────────────────────────────────"
    cat "$PATCH_FILE"
    echo "─────────────────────────────────────────────────────"
    echo ""

    # Open /dev/tty for interactive prompt even when stdin is piped (git hook context)
    exec < /dev/tty
    printf "Apply this fix?\n  [a]pply — apply patch, commit as '%s', then push\n  [s]kip  — skip fix, push as-is\n  [A]bort — abort push entirely\n\nChoice [a/s/A]: " "$(printf "$LOCAL_COMMIT_PATTERN" "auto-fix errors")"
    read -r CHOICE < /dev/tty

    case "${CHOICE:-A}" in
      a|A-lower)
        # Apply the patch
        if git apply --check "$PATCH_FILE" 2>/dev/null; then
          git apply "$PATCH_FILE"
          # Build a short description from the patch header
          FIX_DESC=$(head -5 "$PATCH_FILE" | grep "^@@" | head -1 | sed 's/^.*@@ //' | cut -c1-60 || echo "auto-fix errors")
          COMMIT_MSG=$(printf "$LOCAL_COMMIT_PATTERN" "$FIX_DESC")
          git add -u
          git commit -m "$COMMIT_MSG"
          echo ""
          echo "✅ Fix applied and committed: $COMMIT_MSG"
          echo "   Continuing push..."
          echo ""
          exit 0
        else
          echo "⚠️  Patch failed to apply cleanly — fix manually or skip"
          printf "\n  [s]kip — push as-is\n  [A]bort — abort push\n\nChoice [s/A]: "
          read -r FALLBACK < /dev/tty
          case "${FALLBACK:-A}" in
            s|S) exit 0 ;;
            *)   exit 1 ;;
          esac
        fi
        ;;
      s|S)
        echo "⏭  Skipping fix — pushing as-is"
        exit 0
        ;;
      *)
        echo "🚫 Push aborted"
        exit 1
        ;;
    esac
    ;;
esac
