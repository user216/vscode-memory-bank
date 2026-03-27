#!/bin/bash
# Memory Bank — Stop Hook (v2)
# Reminds the agent to persist session context before ending.
#
# Checks if any TASK-*.md files were modified recently.
# If not, provides a reminder to update task progress.

set -euo pipefail

INPUT=$(cat)

# Infinite loop prevention: use a marker file so the hook only blocks once per session.
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

# Check if any TASK-*.md was modified in the last 5 minutes (v2 flat layout)
RECENT_TASK=""
for task_file in "$MEMORY_BANK"/TASK-*.md; do
  [ -f "$task_file" ] || continue
  LAST_MODIFIED=$(stat -c %Y "$task_file" 2>/dev/null || stat -f %m "$task_file" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_MODIFIED))
  if [ "$DIFF" -lt 300 ]; then
    RECENT_TASK="yes"
    break
  fi
done

# Fall back: check v1 tasks/ subdir
if [ -z "$RECENT_TASK" ] && [ -d "$MEMORY_BANK/tasks" ]; then
  for task_file in "$MEMORY_BANK"/tasks/*.md; do
    [ -f "$task_file" ] || continue
    LAST_MODIFIED=$(stat -c %Y "$task_file" 2>/dev/null || stat -f %m "$task_file" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    DIFF=$((NOW - LAST_MODIFIED))
    if [ "$DIFF" -lt 300 ]; then
      RECENT_TASK="yes"
      break
    fi
  done
fi

if [ -z "$RECENT_TASK" ]; then
  # Create marker so we don't block again if the hook re-fires
  touch "$MARKER_FILE"
  # Clean up marker after 10 minutes (background, ignore errors)
  (sleep 600 && rm -f "$MARKER_FILE" &) 2>/dev/null

  if command -v jq &>/dev/null; then
    jq -n '{
      "hookSpecificOutput": {
        "decision": "block",
        "reason": "Memory Bank: No task files were updated this session. Please update your in-progress task with memory_update_status (include a log_entry) before ending."
      }
    }'
  else
    printf '{"hookSpecificOutput":{"decision":"block","reason":"Memory Bank: No task files were updated this session. Please update your in-progress task with memory_update_status (include a log_entry) before ending."}}\n'
  fi
  exit 0
fi

echo '{}'
