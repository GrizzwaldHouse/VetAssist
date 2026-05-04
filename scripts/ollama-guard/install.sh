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
MODEL_CATALOG="$GUARD_DIR/model-catalog.txt"

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
MODEL=""
FALLBACK_MODEL=""
if [[ -f "$CONFIG_DEST" ]]; then
  _val=$(grep -E "^model:" "$CONFIG_DEST" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g' || true)
  [[ -n "$_val" ]] && MODEL="$_val"
  _val=$(grep -E "^fallback_model:" "$CONFIG_DEST" 2>/dev/null | head -1 | sed 's/^[^:]*: *//;s/"//g' || true)
  [[ -n "$_val" ]] && FALLBACK_MODEL="$_val"
fi

# ── 4. Check model is installed, offer to pull ────────────────────────────────
installed_models() {
  ollama list 2>/dev/null | awk 'NR > 1 && $1 != "" { print $1 }'
}

model_is_installed() {
  local model="$1"
  [[ -n "$model" ]] && installed_models | grep -Fxq "$model"
}

load_model_catalog() {
  if [[ -f "$MODEL_CATALOG" ]]; then
    grep -Ev '^\s*(#|$)' "$MODEL_CATALOG"
  else
    printf '%s\n' codellama:7b deepseek-coder:6.7b codellama:13b llama3:8b qwen2.5-coder:7b llama3.1:8b
  fi
}

prompt_for_model_install() {
  mapfile -t CATALOG < <(load_model_catalog)
  echo ""
  echo "No Ollama models are installed. Pick a model to install:"
  local i=1
  for candidate in "${CATALOG[@]}"; do
    printf "  %2d) %s\n" "$i" "$candidate"
    i=$((i + 1))
  done
  printf "Select a number, enter a model tag, or press Enter to skip: "
  read -r MODEL_CHOICE
  [[ -z "${MODEL_CHOICE:-}" ]] && return 0

  local selected="$MODEL_CHOICE"
  if [[ "$MODEL_CHOICE" =~ ^[0-9]+$ ]] && (( MODEL_CHOICE >= 1 && MODEL_CHOICE <= ${#CATALOG[@]} )); then
    selected="${CATALOG[$((MODEL_CHOICE - 1))]}"
  fi

  echo "Pulling $selected..."
  ollama pull "$selected"
  echo "Installed model: $selected"
}

INSTALLED_COUNT=$(installed_models | wc -l | tr -d ' ')
if [[ "$INSTALLED_COUNT" == "0" ]]; then
  prompt_for_model_install
elif model_is_installed "$MODEL"; then
  echo "Using configured model: $MODEL"
elif model_is_installed "$FALLBACK_MODEL"; then
  echo "Using configured fallback model: $FALLBACK_MODEL"
else
  FIRST_MODEL=$(installed_models | head -1)
  echo "Configured model is not installed; any local model is accepted."
  echo "Using installed model: $FIRST_MODEL"
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
