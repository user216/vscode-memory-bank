#!/bin/bash
# update-model.sh — Propagate model from memory-bank-config.json to all agent files.
#
# Usage:
#   ./scripts/update-model.sh                  # uses model from memory-bank-config.json
#   ./scripts/update-model.sh "Claude Opus 5"  # override with explicit model name
#   ./scripts/update-model.sh --remove         # remove model pinning from all agents
#
# This script:
# 1. Reads the model name from memory-bank-config.json (or CLI argument)
# 2. Updates or inserts the `model:` field in all .agent.md files
# 3. Updates memory-bank-config.json if a CLI argument was provided
# 4. Reports what was changed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$ROOT_DIR/memory-bank-config.json"

REMOVE_MODE=false

# Determine model name
if [ $# -ge 1 ]; then
  if [ "$1" = "--remove" ]; then
    REMOVE_MODE=true
    echo "Removing model pinning from all agent files"
  else
    MODEL="$1"
    # Update config file with new model
    if command -v jq &>/dev/null; then
      jq --arg m "$MODEL" '.model = $m' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    else
      sed -i "s/\"model\": \"[^\"]*\"/\"model\": \"$MODEL\"/" "$CONFIG_FILE"
    fi
    echo "Updated $CONFIG_FILE with model: $MODEL"
  fi
else
  # Read from config
  if command -v jq &>/dev/null; then
    MODEL=$(jq -r '.model' "$CONFIG_FILE")
  else
    MODEL=$(grep -o '"model": "[^"]*"' "$CONFIG_FILE" | sed 's/"model": "//;s/"$//')
  fi
fi

if [ "$REMOVE_MODE" = false ] && [ -z "${MODEL:-}" ]; then
  echo "Error: Could not determine model name" >&2
  exit 1
fi

if [ "$REMOVE_MODE" = false ]; then
  echo "Model: $MODEL"
fi
echo "---"

update_agent_file() {
  local agent_file="$1"
  local label="$2"

  if [ "$REMOVE_MODE" = true ]; then
    # Remove model: line from frontmatter
    if grep -q "^model:" "$agent_file"; then
      sed -i '/^model:.*$/d' "$agent_file"
      echo "Removed model from: $agent_file ($label)"
      return 0
    fi
    return 1
  fi

  if grep -q "^model:" "$agent_file"; then
    # Update existing model: line
    OLD_MODEL=$(grep "^model:" "$agent_file" | head -1)
    sed -i "s/^model:.*$/model: '$MODEL'/" "$agent_file"
    echo "Updated: $agent_file ($label)"
    echo "  was:  $OLD_MODEL"
    echo "  now:  model: '$MODEL'"
    return 0
  else
    # Insert model: after the opening --- in frontmatter
    # Find the first line that starts with --- and insert after it
    sed -i "0,/^---$/{ /^---$/a model: '$MODEL'
    }" "$agent_file"
    echo "Added: $agent_file ($label)"
    echo "  now:  model: '$MODEL'"
    return 0
  fi
}

# Find and update all .agent.md files
UPDATED=0
while IFS= read -r -d '' agent_file; do
  if update_agent_file "$agent_file" "source"; then
    UPDATED=$((UPDATED + 1))
  fi
done < <(find "$ROOT_DIR/agents" -name "*.agent.md" -print0 2>/dev/null)

# Also check .github/agents/ if it exists (installed copies)
if [ -d "$ROOT_DIR/.github/agents" ]; then
  while IFS= read -r -d '' agent_file; do
    if update_agent_file "$agent_file" "installed"; then
      UPDATED=$((UPDATED + 1))
    fi
  done < <(find "$ROOT_DIR/.github/agents" -name "*.agent.md" -print0 2>/dev/null)
fi

echo "---"
if [ "$REMOVE_MODE" = true ]; then
  echo "Removed model pinning from $UPDATED agent file(s)"
else
  echo "Updated $UPDATED agent file(s) to model: $MODEL"
fi
