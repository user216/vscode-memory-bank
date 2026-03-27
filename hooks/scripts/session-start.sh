#!/bin/bash
# Memory Bank — SessionStart Hook (v2)
# Injects project context and ADR compliance warnings into the agent's
# conversation at session start.
#
# v2: reads projectbrief.md + in-progress TASK-*.md (flat layout).
# Also checks ASSERT_* comments in accepted ADR-*.md files.

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
PROJECT_ROOT="$CWD"

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

# -- Gather v2 context --

CONTEXT=""

# Read project brief
if [ -f "$MEMORY_BANK/projectbrief.md" ]; then
  BRIEF=$(cat "$MEMORY_BANK/projectbrief.md")
  CONTEXT="## Project Brief
$BRIEF

"
fi

# Scan for in-progress tasks (v2 flat layout: TASK-*.md)
TASK_CONTEXT=""
for task_file in "$MEMORY_BANK"/TASK-*.md; do
  [ -f "$task_file" ] || continue
  # Check YAML frontmatter for status: In Progress (first 15 lines)
  if head -15 "$task_file" | grep -qi '^status:.*in.progress'; then
    TASK_TITLE=$(grep -m1 '^# ' "$task_file" | sed 's/^# //' || basename "$task_file" .md)
    TASK_CONTEXT="${TASK_CONTEXT}### $(basename "$task_file" .md): ${TASK_TITLE}
"
  fi
done

# Fall back to v1 tasks/ subdir
if [ -z "$TASK_CONTEXT" ] && [ -d "$MEMORY_BANK/tasks" ]; then
  for task_file in "$MEMORY_BANK"/tasks/*.md; do
    [ -f "$task_file" ] || continue
    [ "$(basename "$task_file")" = "_index.md" ] && continue
    if grep -qi '^\*\*Status:\*\*.*In Progress' "$task_file" 2>/dev/null; then
      TASK_TITLE=$(grep -m1 '^# ' "$task_file" | sed 's/^# //' || basename "$task_file" .md)
      TASK_CONTEXT="${TASK_CONTEXT}### $(basename "$task_file" .md): ${TASK_TITLE}
"
    fi
  done
fi

if [ -n "$TASK_CONTEXT" ]; then
  CONTEXT="${CONTEXT}## In-Progress Tasks
${TASK_CONTEXT}
"
fi

# -- ADR Compliance Check --

WARN_FILE=$(mktemp)
trap 'rm -f "$WARN_FILE"' EXIT

for adr_file in "$MEMORY_BANK"/ADR-*.md; do
  [ -f "$adr_file" ] || continue

  # Only check accepted ADRs (check YAML frontmatter)
  if ! head -10 "$adr_file" | grep -qi '^status:.*accepted'; then
    continue
  fi

  ADR_ID=$(basename "$adr_file" .md)

  # Extract ## Verification section (between ## Verification and next ## or EOF)
  VERIFY_SECTION=$(sed -n '/^## Verification/,/^## /p' "$adr_file" | sed '1d;$d')
  # If no next section, get everything after ## Verification
  if [ -z "$VERIFY_SECTION" ]; then
    VERIFY_SECTION=$(sed -n '/^## Verification/,$p' "$adr_file" | sed '1d')
  fi
  [ -n "$VERIFY_SECTION" ] || continue

  # Process ASSERT_FILE_EXISTS
  { echo "$VERIFY_SECTION" | grep -o '<!-- ASSERT_FILE_EXISTS: [^>]*-->' || true; } | while read -r line; do
    FILE_PATH=$(echo "$line" | sed 's/<!-- ASSERT_FILE_EXISTS: //;s/ *-->//')
    if [ ! -e "$PROJECT_ROOT/$FILE_PATH" ]; then
      echo "- $ADR_ID: ASSERT_FILE_EXISTS failed — $FILE_PATH does not exist" >> "$WARN_FILE"
    fi
  done

  # Process ASSERT_FILE_NOT_EXISTS
  { echo "$VERIFY_SECTION" | grep -o '<!-- ASSERT_FILE_NOT_EXISTS: [^>]*-->' || true; } | while read -r line; do
    FILE_PATH=$(echo "$line" | sed 's/<!-- ASSERT_FILE_NOT_EXISTS: //;s/ *-->//')
    if [ -e "$PROJECT_ROOT/$FILE_PATH" ]; then
      echo "- $ADR_ID: ASSERT_FILE_NOT_EXISTS failed — $FILE_PATH exists" >> "$WARN_FILE"
    fi
  done

  # Process ASSERT_CONTAINS
  { echo "$VERIFY_SECTION" | grep -o '<!-- ASSERT_CONTAINS: [^>]*-->' || true; } | while read -r line; do
    PAYLOAD=$(echo "$line" | sed 's/<!-- ASSERT_CONTAINS: //;s/ *-->//')
    FILE_PATH=$(echo "$PAYLOAD" | sed 's/ *|.*//')
    SEARCH=$(echo "$PAYLOAD" | sed 's/[^|]*| *//')
    if [ -f "$PROJECT_ROOT/$FILE_PATH" ]; then
      if ! grep -qF "$SEARCH" "$PROJECT_ROOT/$FILE_PATH" 2>/dev/null; then
        echo "- $ADR_ID: ASSERT_CONTAINS failed — $FILE_PATH missing '$SEARCH'" >> "$WARN_FILE"
      fi
    fi
  done

  # Process ASSERT_NOT_CONTAINS
  { echo "$VERIFY_SECTION" | grep -o '<!-- ASSERT_NOT_CONTAINS: [^>]*-->' || true; } | while read -r line; do
    PAYLOAD=$(echo "$line" | sed 's/<!-- ASSERT_NOT_CONTAINS: //;s/ *-->//')
    FILE_PATH=$(echo "$PAYLOAD" | sed 's/ *|.*//')
    SEARCH=$(echo "$PAYLOAD" | sed 's/[^|]*| *//')
    if [ -f "$PROJECT_ROOT/$FILE_PATH" ]; then
      if grep -qF "$SEARCH" "$PROJECT_ROOT/$FILE_PATH" 2>/dev/null; then
        echo "- $ADR_ID: ASSERT_NOT_CONTAINS failed — $FILE_PATH contains '$SEARCH'" >> "$WARN_FILE"
      fi
    fi
  done
done

if [ -s "$WARN_FILE" ]; then
  WARNINGS=$(cat "$WARN_FILE")
  CONTEXT="${CONTEXT}## ADR Compliance Warnings
${WARNINGS}

Run \`memory_verify_decisions\` for a full compliance report.
"
fi

# -- Output --

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
