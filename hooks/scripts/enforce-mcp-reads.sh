#!/bin/bash
# hooks/scripts/enforce-mcp-reads.sh
# PreToolUse hook: blocks direct Read/Grep/Glob on memory-bank/ folder.
# Forces agent to use MCP tools (memory_recall, memory_search, memory_query,
# memory_graph, memory_schema) for reads instead.
# Edit/Write are allowed since MCP is read-only.

INPUT=$(cat)

# Extract path from tool_input — different tools use different field names
# Read uses file_path, Grep/Glob use path
TOOL_PATH=""
for field in file_path path; do
  val=$(echo "$INPUT" | grep -o "\"$field\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"//;s/\"//")
  if [ -n "$val" ]; then
    TOOL_PATH="$val"
    break
  fi
done

# Check if the path targets the memory-bank/ directory
# Pattern: /memory-bank/ preceded by / (not by - or alphanumeric)
# This avoids false positives on repo names like "vscode-memory-bank/extension/..."
if echo "$TOOL_PATH" | grep -qP '(?<![a-zA-Z0-9_-])memory-bank/'; then
  cat <<'DENY'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Direct file reads on memory-bank/ are not allowed. Use MCP tools instead: memory_recall (context retrieval), memory_search (full-text search), memory_query (structured query), memory_graph (relationships), memory_schema (data model). For writes, use Edit/Write tools directly on the markdown files."
  }
}
DENY
  exit 0
fi

# Path doesn't target memory-bank — allow
exit 0
