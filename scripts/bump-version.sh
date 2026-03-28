#!/usr/bin/env bash
# Bump versions, sync all references, compile, bundle, and package VSIX.
#
# Usage:
#   ./scripts/bump-version.sh <mcp-version> <ext-version>   # set both
#   ./scripts/bump-version.sh <ext-version>                  # set ext only
#   ./scripts/bump-version.sh --bump both                    # auto-bump patches
#   ./scripts/bump-version.sh --bump ext                     # auto-bump ext patch
#   ./scripts/bump-version.sh                                # show current versions

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC="$REPO_ROOT/scripts/sync-versions.js"

# No args — show current versions
if [[ $# -lt 1 ]]; then
  node "$SYNC"
  exit 0
fi

# --bump shorthand
if [[ "$1" == "--bump" ]]; then
  TARGET="${2:-both}"
  node "$SYNC" --bump "$TARGET"
else
  # Positional args: <mcp-version> <ext-version> or <ext-version>
  if [[ $# -ge 2 ]]; then
    node "$SYNC" --set-mcp "$1" --set-ext "$2"
  else
    node "$SYNC" --set-ext "$1"
  fi
fi

# Read final extension version for VSIX name
EXT_VER=$(node -p "require('$REPO_ROOT/extension/package.json').version")

# Compile MCP server
echo ""
echo "Compiling MCP server..."
(cd "$REPO_ROOT/mcp" && npx tsc)

# Bundle MCP into extension
echo "Bundling MCP server into extension..."
(cd "$REPO_ROOT/extension" && node scripts/bundle-mcp.js)

# Build extension
echo "Building extension..."
(cd "$REPO_ROOT/extension" && npm run build)

# Package VSIX (skip auto-version since we already bumped)
echo "Packaging VSIX..."
(cd "$REPO_ROOT/extension" && npx @vscode/vsce package)

echo ""
echo "Done! Install with:"
echo "  code --install-extension extension/vscode-memory-bank-${EXT_VER}.vsix"
