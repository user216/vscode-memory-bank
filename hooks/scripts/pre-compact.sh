#!/bin/bash
# Memory Bank — PreCompact Hook (v2)
# Annotates the most recent in-progress task before context compaction.
#
# When the conversation is about to be compacted (context window full),
# this hook ensures the current working state is annotated so it
# survives the compaction.

set -euo pipefail

INPUT=$(cat)

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

# Find the most recently modified in-progress TASK-*.md (v2 flat layout)
LATEST_TASK=""
LATEST_MTIME=0
for task_file in "$MEMORY_BANK"/TASK-*.md; do
  [ -f "$task_file" ] || continue
  # Check if it's in-progress
  if head -15 "$task_file" | grep -qi '^status:.*in.progress'; then
    MTIME=$(stat -c %Y "$task_file" 2>/dev/null || stat -f %m "$task_file" 2>/dev/null || echo 0)
    if [ "$MTIME" -gt "$LATEST_MTIME" ]; then
      LATEST_MTIME=$MTIME
      LATEST_TASK="$task_file"
    fi
  fi
done

# Fall back to v1 tasks/ subdir
if [ -z "$LATEST_TASK" ] && [ -d "$MEMORY_BANK/tasks" ]; then
  for task_file in "$MEMORY_BANK"/tasks/*.md; do
    [ -f "$task_file" ] || continue
    [ "$(basename "$task_file")" = "_index.md" ] && continue
    if grep -qi '^\*\*Status:\*\*.*In Progress' "$task_file" 2>/dev/null; then
      MTIME=$(stat -c %Y "$task_file" 2>/dev/null || stat -f %m "$task_file" 2>/dev/null || echo 0)
      if [ "$MTIME" -gt "$LATEST_MTIME" ]; then
        LATEST_MTIME=$MTIME
        LATEST_TASK="$task_file"
      fi
    fi
  done
fi

if [ -n "$LATEST_TASK" ]; then
  {
    echo ""
    echo "---"
    echo "_Context compaction occurred at $(date -Iseconds). Above state was preserved by pre-compact hook._"
  } >> "$LATEST_TASK"
fi

# Return a system message so the agent knows compaction happened
if command -v jq &>/dev/null; then
  jq -n '{
    "systemMessage": "Memory Bank: Context compaction occurred. Use memory_recall to restore project context after compaction."
  }'
else
  printf '{"systemMessage":"Memory Bank: Context compaction occurred. Use memory_recall to restore project context after compaction."}\n'
fi
