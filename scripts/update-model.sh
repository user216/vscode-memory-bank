#!/bin/bash
# update-model.sh — Propagate model from memory-bank-config.json to all agent files.
#
# Usage:
#   ./scripts/update-model.sh                  # uses model from memory-bank-config.json
#   ./scripts/update-model.sh "Claude Opus 5"  # override with explicit model name
#
# This script:
# 1. Reads the model name from memory-bank-config.json (or CLI argument)
# 2. Updates the `model:` field in all .agent.md files
# 3. Updates memory-bank-config.json if a CLI argument was provided
# 4. Reports what was changed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$ROOT_DIR/memory-bank-config.json"

# Determine model name
if [ $# -ge 1 ]; then
  MODEL="$1"
  # Update config file with new model
  if command -v jq &>/dev/null; then
    jq --arg m "$MODEL" '.model = $m' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  else
    # Fallback without jq: simple sed replacement
    sed -i "s/\"model\": \"[^\"]*\"/\"model\": \"$MODEL\"/" "$CONFIG_FILE"
  fi
  echo "Updated $CONFIG_FILE with model: $MODEL"
else
  # Read from config
  if command -v jq &>/dev/null; then
    MODEL=$(jq -r '.model' "$CONFIG_FILE")
  else
    MODEL=$(grep -o '"model": "[^"]*"' "$CONFIG_FILE" | sed 's/"model": "//;s/"$//')
  fi
fi

if [ -z "$MODEL" ]; then
  echo "Error: Could not determine model name" >&2
  exit 1
fi

echo "Model: $MODEL"
echo "---"

# Find and update all .agent.md files
UPDATED=0
while IFS= read -r -d '' agent_file; do
  if grep -q "^model:" "$agent_file"; then
    OLD_MODEL=$(grep "^model:" "$agent_file" | head -1)
    sed -i "s/^model:.*$/model: '$MODEL'/" "$agent_file"
    echo "Updated: $agent_file"
    echo "  was:  $OLD_MODEL"
    echo "  now:  model: '$MODEL'"
    UPDATED=$((UPDATED + 1))
  fi
done < <(find "$ROOT_DIR/agents" -name "*.agent.md" -print0 2>/dev/null)

# Also check .github/agents/ if it exists (installed copies)
if [ -d "$ROOT_DIR/.github/agents" ]; then
  while IFS= read -r -d '' agent_file; do
    if grep -q "^model:" "$agent_file"; then
      sed -i "s/^model:.*$/model: '$MODEL'/" "$agent_file"
      echo "Updated (installed): $agent_file"
      UPDATED=$((UPDATED + 1))
    fi
  done < <(find "$ROOT_DIR/.github/agents" -name "*.agent.md" -print0 2>/dev/null)
fi

echo "---"
echo "Updated $UPDATED agent file(s) to model: $MODEL"
