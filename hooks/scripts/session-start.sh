#!/bin/bash
# Memory Bank — SessionStart Hook
# Injects active context into the agent's conversation at session start.
#
# Reads activeContext.md and recent progress, returns them as additionalContext
# so the agent starts every session with project awareness.

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Determine workspace root — try jq first, fall back to pwd
if command -v jq &>/dev/null; then
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
else
  CWD=$(echo "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"cwd"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)
fi
if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

MEMORY_BANK="$CWD/memory-bank"

# Check if memory bank exists
if [ ! -d "$MEMORY_BANK" ]; then
  if command -v jq &>/dev/null; then
    jq -n '{
      "hookSpecificOutput": {
        "additionalContext": "No memory-bank/ folder found in this workspace. You can initialize one by running /memory-init or creating the folder structure manually."
      }
    }'
  else
    printf '{"hookSpecificOutput":{"additionalContext":"No memory-bank/ folder found in this workspace. You can initialize one by running /memory-init or creating the folder structure manually."}}\n'
  fi
  exit 0
fi

# Read active context and progress
CONTEXT=""

if [ -f "$MEMORY_BANK/activeContext.md" ]; then
  ACTIVE=$(cat "$MEMORY_BANK/activeContext.md")
  CONTEXT="## Active Context
$ACTIVE

"
fi

if [ -f "$MEMORY_BANK/progress.md" ]; then
  PROGRESS=$(cat "$MEMORY_BANK/progress.md")
  CONTEXT="${CONTEXT}## Progress
$PROGRESS

"
fi

if [ -f "$MEMORY_BANK/tasks/_index.md" ]; then
  TASKS=$(cat "$MEMORY_BANK/tasks/_index.md")
  CONTEXT="${CONTEXT}## Tasks
$TASKS"
fi

if [ -n "$CONTEXT" ]; then
  if command -v jq &>/dev/null; then
    ESCAPED=$(printf '%s' "$CONTEXT" | jq -Rs .)
    echo "{\"hookSpecificOutput\":{\"additionalContext\":$ESCAPED}}"
  else
    # Escape for JSON manually: backslashes, quotes, newlines, tabs
    ESCAPED=$(printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
    printf '{"hookSpecificOutput":{"additionalContext":"%s"}}\n' "$ESCAPED"
  fi
else
  echo '{}'
fi
