#!/usr/bin/env bash
# install.sh
# Developer: Marcus Daley
# Purpose: One-command installer for ollama-guard — wires pre-push hook into current repo
# Usage: curl -s <source_url>/install.sh | bash
#   OR:  bash scripts/ollama-guard/install.sh   (from within the repo)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
GUARD_DIR="$REPO_ROOT/scripts/ollama-guard"
CONFIG_DEST="$REPO_ROOT/.ollama-guard.yml"
CONFIG_TEMPLATE="$GUARD_DIR/.ollama-guard.yml.template"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ollama-guard installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Check git repo ─────────────────────────────────────────────────────────
if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "❌ Not a git repository — run from inside a git repo"
  exit 1
fi
echo "✅ Git repo: $REPO_ROOT"

# ── 2. Check Ollama is installed ──────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo ""
  echo "❌ Ollama is not installed."
  echo "   Install it from: https://ollama.com/download"
  echo "   Then re-run this installer."
  exit 1
fi
echo "✅ Ollama: $(ollama --version 2>/dev/null | head -1 || echo 'found')"

# ── 3. Read model from config (or use default) ────────────────────────────────
MODEL="codellama:7b"
FALLBACK_MODEL="deepseek-coder:6.7b"
if [[ -f "$CONFIG_DEST" ]]; then
  _val=$(grep -E "^model:" "$CONFIG_DEST" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g' || true)
  [[ -n "$_val" ]] && MODEL="$_val"
  _val=$(grep -E "^fallback_model:" "$CONFIG_DEST" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g' || true)
  [[ -n "$_val" ]] && FALLBACK_MODEL="$_val"
fi

# ── 4. Check model is installed, offer to pull ────────────────────────────────
if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo ""
  echo "⚠️  Model '$MODEL' is not installed."
  printf "   Pull it now? (~4GB download) [y/N]: "
  read -r PULL_CHOICE
  if [[ "${PULL_CHOICE:-N}" =~ ^[yY]$ ]]; then
    echo "   Pulling $MODEL..."
    ollama pull "$MODEL"
    echo "✅ Model pulled: $MODEL"
  else
    echo "   Skipped — checking fallback model '$FALLBACK_MODEL'..."
    if ! ollama list 2>/dev/null | grep -q "$FALLBACK_MODEL"; then
      echo ""
      printf "   Pull fallback model '$FALLBACK_MODEL'? (~4GB) [y/N]: "
      read -r PULL_FB
      if [[ "${PULL_FB:-N}" =~ ^[yY]$ ]]; then
        ollama pull "$FALLBACK_MODEL"
        echo "✅ Fallback model pulled: $FALLBACK_MODEL"
      else
        echo "⚠️  No model available — ollama-guard will skip checks until a model is installed"
      fi
    else
      echo "✅ Fallback model already installed: $FALLBACK_MODEL"
    fi
  fi
else
  echo "✅ Model: $MODEL (installed)"
fi

# ── 5. Copy config template if not present ────────────────────────────────────
if [[ ! -f "$CONFIG_DEST" ]]; then
  if [[ -f "$CONFIG_TEMPLATE" ]]; then
    cp "$CONFIG_TEMPLATE" "$CONFIG_DEST"
    echo "✅ Config created: .ollama-guard.yml (edit to customize)"
  else
    echo "⚠️  Config template not found — skipping (you can copy .ollama-guard.yml.template manually)"
  fi
else
  echo "✅ Config: .ollama-guard.yml (already exists — not overwritten)"
fi

# ── 6. Make scripts executable ────────────────────────────────────────────────
chmod +x "$GUARD_DIR/ollama-check.sh" 2>/dev/null || true
chmod +x "$GUARD_DIR/pre-push.sh"    2>/dev/null || true
echo "✅ Scripts marked executable"

# ── 7. Install pre-push hook ──────────────────────────────────────────────────
HOOK_FILE="$HOOKS_DIR/pre-push"

if [[ -f "$HOOK_FILE" ]]; then
  # Check if ollama-guard is already wired in
  if grep -q "ollama-guard" "$HOOK_FILE" 2>/dev/null; then
    echo "✅ pre-push hook: already installed"
  else
    # Append to existing hook
    echo "" >> "$HOOK_FILE"
    echo "# ollama-guard" >> "$HOOK_FILE"
    echo "\"$GUARD_DIR/pre-push.sh\" \"\$@\"" >> "$HOOK_FILE"
    echo "✅ pre-push hook: appended to existing hook"
  fi
else
  # Create new hook
  cat > "$HOOK_FILE" << HOOK
#!/usr/bin/env bash
# pre-push hook — managed by ollama-guard
# Developer: Marcus Daley

"$GUARD_DIR/pre-push.sh" "\$@"
HOOK
  chmod +x "$HOOK_FILE"
  echo "✅ pre-push hook: installed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ ollama-guard installed successfully"
echo ""
echo "  Next push will run the error check."
echo "  Edit .ollama-guard.yml to customize."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
