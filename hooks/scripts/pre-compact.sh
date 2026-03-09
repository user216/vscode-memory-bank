#!/bin/bash
# Memory Bank — PreCompact Hook
# Saves a snapshot of activeContext.md before context compaction.
#
# When the conversation is about to be compacted (context window full),
# this hook ensures the current active context is preserved to disk
# so it survives the compaction.

set -euo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

MEMORY_BANK="$CWD/memory-bank"

if [ ! -d "$MEMORY_BANK" ]; then
  echo '{}'
  exit 0
fi

# Create a timestamped backup of activeContext before compaction
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if [ -f "$MEMORY_BANK/activeContext.md" ]; then
  # Add a compaction marker to the active context
  {
    echo ""
    echo "---"
    echo "_Context compaction occurred at $(date -Iseconds). Above state was preserved by pre-compact hook._"
  } >> "$MEMORY_BANK/activeContext.md"
fi

# Return a system message so the agent knows compaction happened
jq -n '{
  "systemMessage": "Memory Bank: activeContext.md has been preserved before compaction. After compaction, re-read memory-bank/activeContext.md to restore context."
}'
