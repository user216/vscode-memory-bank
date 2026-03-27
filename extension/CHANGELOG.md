# Changelog — VS Code Extension

## 0.3.1

### Changed
- **Zero runtime install** — MCP server dependencies are all pure JS now (no `better-sqlite3`). Dependencies bundled at build time inside the VSIX. No more `npm install --production` at extension activation.
- **Simplified `McpServerBootstrap`** — Removed `install()` method entirely. `isReady()` just checks if `build/index.js` exists (it always does since it's bundled).
- **`bundle-mcp.js` upgraded** — Now runs `npm install --production` at build time to bundle `node_modules/` into `extension/mcp-server/`.
- **Dual-layout sidebar support** — Tasks and Decisions tree providers scan both `tasks/`/`decisions/` subdirectories (v1) and flat `TASK-*.md`/`ADR-*.md` files (v2).
- **YAML frontmatter parsing** — Sidebar providers extract status from YAML frontmatter (`status:` field) in addition to `**Status:**` pattern.
- **Git hook simplified** — `installGitHook()` is now a no-op (no SQLite DB to stage via pre-commit).
- **`ensureGitConfig()` simplified** — `.gitignore` only ignores `.mcp/*` (no DB negation rules, no WAL entries).
- **Init command updated** — Removed `.gitattributes` creation (`*.db binary` no longer needed). Simplified `.gitignore` template.

## 0.2.1

### Fixed
- **MCP status bar button**: Removed broken server toggle that spawned a ghost process no client connected to. The Claude Agent SDK manages the MCP server lifecycle via `.mcp.json` — the extension no longer interferes.
- **Status bar now informational**: Shows whether `.mcp.json` is configured. Click opens the config file for inspection or offers to create one.

## 0.2.0

### Added
- **Knowledge Graph webview**: Interactive force-directed graph visualization of memory bank items
  - Canvas 2D rendering with no external dependencies
  - Scans core files, tasks, and decisions; extracts cross-references (`TASK-\d+`, `ADR-\d{4}`)
  - Drag nodes to rearrange, hover for tooltips, double-click to open files
  - Color-coded nodes: blue (core), green (task), yellow (decision)
  - Command: `Memory Bank: Show Knowledge Graph`
- **MCP server lifecycle manager**: Start/stop the MCP server from within VS Code
  - Auto-discovers server at workspace `mcp/build/index.js` or extension-bundled path
  - Status bar indicator (running/stopped/error) with click-to-toggle
  - Dedicated output channel for server logs
  - Passes `MEMORY_BANK_PATH` environment variable to server process
  - Command: `Memory Bank: Toggle MCP Server`

## 0.1.0

### Added
- **Sidebar tree views**: Files, Tasks, Decisions panels in activity bar
  - Files view: shows core memory bank files with green/red existence indicators
  - Tasks view: parses task files, shows status icons (spinning for In Progress, checkmark for Completed)
  - Decisions view: parses ADR files with status-based icons
- **Status bar**: Shows current focus from `activeContext.md` and active task count
- **Commands**: `Refresh`, `Open File`, `Initialize Memory Bank`
- **File watcher**: Auto-refreshes all views when `.md` files change in `memory-bank/`
- **Initialize command**: Scaffolds a new memory bank with all core files, tasks/, and decisions/ directories
- **Settings**: `memoryBank.statusBar.enabled`, `memoryBank.fileWatcher.enabled`
- Activation trigger: `workspaceContains:memory-bank/projectbrief.md`
