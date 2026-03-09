#!/bin/bash
# Memory Bank — PreCompact Hook
# Saves a snapshot of activeContext.md before context compaction.
#
# When the conversation is about to be compacted (context window full),
# this hook ensures the current active context is preserved to disk
# so it survives the compaction.

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

if [ -f "$MEMORY_BANK/activeContext.md" ]; then
  # Add a compaction marker to the active context
  {
    echo ""
    echo "---"
    echo "_Context compaction occurred at $(date -Iseconds). Above state was preserved by pre-compact hook._"
  } >> "$MEMORY_BANK/activeContext.md"
fi

# Return a system message so the agent knows compaction happened
if command -v jq &>/dev/null; then
  jq -n '{
    "systemMessage": "Memory Bank: activeContext.md has been preserved before compaction. After compaction, re-read memory-bank/activeContext.md to restore context."
  }'
else
  printf '{"systemMessage":"Memory Bank: activeContext.md has been preserved before compaction. After compaction, re-read memory-bank/activeContext.md to restore context."}\n'
fi
