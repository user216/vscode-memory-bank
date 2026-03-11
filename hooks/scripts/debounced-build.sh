#!/usr/bin/env bash
# Auto-rebuild MCP server if any source file is newer than the compiled output.
# Used as a Claude Code "Stop" hook — runs once after the full response ends.

MCP_DIR="$(cd "$(dirname "$0")/../../mcp" && pwd)"
MARKER="$MCP_DIR/dist/index.js"

# If dist doesn't exist at all, definitely build
if [[ ! -f "$MARKER" ]]; then
  cd "$MCP_DIR" && npm run build 2>&1 | tail -5
  exit $?
fi

# Find any .ts source file newer than the compiled output
newer=$(find "$MCP_DIR/src" -name '*.ts' -newer "$MARKER" -print -quit 2>/dev/null)

if [[ -n "$newer" ]]; then
  cd "$MCP_DIR" && npm run build 2>&1 | tail -5
fi
