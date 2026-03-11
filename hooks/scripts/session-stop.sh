#!/bin/bash
# Memory Bank — Stop Hook
# Reminds the agent to persist session context before ending.
#
# This hook fires when the agent session is about to end.
# It checks if activeContext.md has been updated recently and
# provides a reminder if it hasn't.

set -euo pipefail

INPUT=$(cat)

# Infinite loop prevention: use a marker file so the hook only blocks once per session.
# The old approach relied on a non-existent `stop_hook_active` field in the hook input.
MARKER_DIR="${TMPDIR:-/tmp}"
MARKER_FILE="$MARKER_DIR/mbvmb-stop-hook-$$"

if [ -f "$MARKER_FILE" ]; then
  echo '{}'
  exit 0
fi

# Determine workspace root
if command -v jq &>/dev/null; then
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
else
  CWD=$(echo "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"cwd"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)
fi
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
  # Cross-platform stat: GNU (Linux) then BSD (macOS)
  LAST_MODIFIED=$(stat -c %Y "$MEMORY_BANK/activeContext.md" 2>/dev/null || stat -f %m "$MEMORY_BANK/activeContext.md" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_MODIFIED))

  if [ "$DIFF" -gt 300 ]; then
    # Create marker so we don't block again if the hook re-fires
    touch "$MARKER_FILE"
    # Clean up marker after 10 minutes (background, ignore errors)
    (sleep 600 && rm -f "$MARKER_FILE" &) 2>/dev/null

    if command -v jq &>/dev/null; then
      jq -n '{
        "hookSpecificOutput": {
          "decision": "block",
          "reason": "Memory Bank: activeContext.md has not been updated this session. Please update memory-bank/activeContext.md and memory-bank/progress.md with the current session state before ending."
        }
      }'
    else
      printf '{"hookSpecificOutput":{"decision":"block","reason":"Memory Bank: activeContext.md has not been updated this session. Please update memory-bank/activeContext.md and memory-bank/progress.md with the current session state before ending."}}\n'
    fi
    exit 0
  fi
fi

# Checkpoint WAL so memory-bank.db is ready for git commit
if [ -f "$MEMORY_BANK/.mcp/memory-bank.db" ]; then
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "$MEMORY_BANK/.mcp/memory-bank.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
  fi
fi

echo '{}'
