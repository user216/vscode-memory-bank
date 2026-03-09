#!/bin/bash
# Memory Bank — Stop Hook
# Reminds the agent to persist session context before ending.
#
# This hook fires when the agent session is about to end.
# It checks if activeContext.md has been updated recently and
# provides a reminder if it hasn't.

set -euo pipefail

INPUT=$(cat)

# Check for infinite loop prevention
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_ACTIVE" = "true" ]; then
  # Already in a stop hook cycle — do not block again
  echo '{}'
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

MEMORY_BANK="$CWD/memory-bank"

if [ ! -d "$MEMORY_BANK" ]; then
  echo '{}'
  exit 0
fi

# Check if activeContext.md was modified in the last 5 minutes
if [ -f "$MEMORY_BANK/activeContext.md" ]; then
  LAST_MODIFIED=$(stat -c %Y "$MEMORY_BANK/activeContext.md" 2>/dev/null || stat -f %m "$MEMORY_BANK/activeContext.md" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_MODIFIED))

  if [ "$DIFF" -gt 300 ]; then
    # activeContext.md hasn't been updated in over 5 minutes — ask agent to update
    jq -n '{
      "hookSpecificOutput": {
        "decision": "block",
        "reason": "Memory Bank: activeContext.md has not been updated this session. Please update memory-bank/activeContext.md and memory-bank/progress.md with the current session state before ending."
      }
    }'
    exit 0
  fi
fi

echo '{}'
