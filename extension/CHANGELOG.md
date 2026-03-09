# Changelog — VS Code Extension

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
