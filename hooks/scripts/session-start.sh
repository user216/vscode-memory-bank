#!/bin/bash
# Memory Bank — SessionStart Hook
# Injects active context into the agent's conversation at session start.
#
# Reads activeContext.md and recent progress, returns them as additionalContext
# so the agent starts every session with project awareness.

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Determine workspace root
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

MEMORY_BANK="$CWD/memory-bank"

# Check if memory bank exists
if [ ! -d "$MEMORY_BANK" ]; then
  # No memory bank — provide hint to initialize
  jq -n '{
    "hookSpecificOutput": {
      "additionalContext": "No memory-bank/ folder found in this workspace. You can initialize one by running /memory-init or creating the folder structure manually."
    }
  }'
  exit 0
fi

# Read active context and progress
CONTEXT=""

if [ -f "$MEMORY_BANK/activeContext.md" ]; then
  ACTIVE=$(cat "$MEMORY_BANK/activeContext.md")
  CONTEXT="## Active Context\n$ACTIVE\n\n"
fi

if [ -f "$MEMORY_BANK/progress.md" ]; then
  PROGRESS=$(cat "$MEMORY_BANK/progress.md")
  CONTEXT="${CONTEXT}## Progress\n$PROGRESS\n\n"
fi

if [ -f "$MEMORY_BANK/tasks/_index.md" ]; then
  TASKS=$(cat "$MEMORY_BANK/tasks/_index.md")
  CONTEXT="${CONTEXT}## Tasks\n$TASKS"
fi

if [ -n "$CONTEXT" ]; then
  # Escape for JSON
  ESCAPED=$(echo -e "$CONTEXT" | jq -Rs .)
  echo "{\"hookSpecificOutput\":{\"additionalContext\":$ESCAPED}}"
else
  echo '{}'
fi
