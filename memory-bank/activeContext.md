# Active Context

## Current Focus
Forked DB Viewer Enhanced extension with FTS5 support, added as git submodule

## Recent Changes
- Forked stopper2408/db-viewer as user216/db-viewer-enhanced on GitHub
- Built sql.js WASM with FTS5 enabled using Docker (emscripten/emsdk)
- Added fork as git submodule at db-viewer/ in vscode-memory-bank
- Modified esbuild.js to use custom FTS5-enabled sql-wasm.wasm from wasm/ dir
- Pinned dependency versions to available releases
- Created scripts/build-wasm-fts5.sh for future WASM rebuilds
- Packaged and installed extension locally (replaces community-dev.db-viewer-enhanced)
- Added sqlite.sqlite3 setting to VS Code pointing to /usr/bin/sqlite3 (for alexcvzz extension)

## Current Decisions
- ADR-0005: Agent is Claude Agent Preview in VS Code Copilot, NOT Claude Code CLI
- ADR-0006: MCP config is at .mcp.json (project root), not .vscode/mcp.json
- MCP status bar is informational only — SDK manages server lifecycle
- Memory bank updates (ADRs, tasks, context) are mandatory and automatic per Layer 0 instructions

## Next Steps
1. Reload VS Code and verify items_fts table loads without FTS5 errors
2. Commit changes to db-viewer fork and push to GitHub
3. Commit submodule addition to vscode-memory-bank main repo

