# Changelog — VS Code Extension

## 0.6.4

### Added
- **Titles in sidebar** — Tasks, Decisions, and Notes now show the `title:` from YAML frontmatter (or H1 heading) as the label instead of bare file IDs (ADR-0023)
- **Tags in Tasks & Decisions** — tags from YAML frontmatter displayed in the description alongside status, separated by `·`
- **Status-based sorting** — Tasks sort In Progress → Pending → Completed → Abandoned; Decisions sort Proposed → Accepted → Deprecated → Superseded → Rejected
- **Expandable relations** — items referencing other items (via `related:` frontmatter, cross-references in body text, or `[[wikilinks]]`) expand to show clickable relation children with purple link icons

### Changed
- **Shared `frontmatter-utils.ts`** — consolidated duplicated `extractStatus()` and `extractTags()` from 3 providers into a shared module; added `extractTitle()`, `buildRelations()`, `buildDescription()`, and `RelationItem` class
- **Tree provider type signatures** — all 3 providers now use `TreeDataProvider<*Item | RelationItem>` union type to support expandable children

## 0.4.0

### Added
- **Notes sidebar section** — new "Notes" view showing `NOTE-*.md` files with tags from YAML frontmatter as description
- **`memoryBankNotes` tree data provider** — v2-only, no legacy subdir scan
- **3 new MCP tools** (ADR-0019): `memory_bulk_update_status`, `memory_add_tag`, `memory_migrate_v1`

### Fixed
- **`extractStatus()` in Tasks/Decisions providers** — added `## Status:` heading fallback (3-tier: YAML frontmatter → `**Status:**` bold → `## Status:` heading)
- **"No view is registered with id: memoryBankNotes"** — register placeholder tree data providers eagerly in `activate()` so VS Code can restore sidebar views from a previous session before async `initializeFullUI` completes

### Changed
- **`memoryBank.init` v2 flat layout** — no longer creates `tasks/` and `decisions/` subdirectories or `_index.md` files; creates core files with YAML frontmatter
- **MCP server v2.1.0** — updated bundled MCP server with STATUS_ALIASES, gray-matter YAML parsing, and 3 new tools
- **Removed orphaned v1 artifacts** — deleted stale NOTE files, SQLite DB, simplified `.gitignore`

## 0.3.1

### Added
- **MCP Setup sidebar section** — new "MCP Setup" view showing auto-configured status for Copilot and click-to-copy config for Claude Code / other tools
- **`memoryBank.copyMcpConfig` command** — copies MCP server config JSON to clipboard for manual setup
- **Build verification tests** — 13 tests covering VSIX bundling, `.vscodeignore` rules, and config generator behavior (`node --test test/bundle-verify.test.js`)

### Fixed
- **MCP server crash after upgrade** — `.vscodeignore` excluded `mcp-server/node_modules/**`, stripping bundled dependencies from the VSIX. After upgrading (e.g. 0.3.0 → 0.3.1), the MCP server failed with `ERR_MODULE_NOT_FOUND: Cannot find package '@modelcontextprotocol/sdk'`
- **Stale MCP server path after upgrade** — config generator now always refreshes `args[0]` in `.vscode/mcp.json` to match the current extension version path, preserving user-customized `env` settings

### Changed
- **Zero runtime install** — MCP server dependencies are all pure JS now (no `better-sqlite3`). Dependencies bundled at build time inside the VSIX. No more `npm install --production` at extension activation.
- **Stopped generating `.mcp.json`** — Claude Agent SDK no longer uses it. Only `.vscode/mcp.json` generated for GitHub Copilot.
- **Config generator won't overwrite** — skips writing if `memory-bank` entry already exists in `.vscode/mcp.json`
- **Simplified `McpServerBootstrap`** — Removed `install()` method entirely. `isReady()` just checks if `build/index.js` exists (it always does since it's bundled).
- **`bundle-mcp.js` upgraded** — Now runs `npm install --production` at build time to bundle `node_modules/` into `extension/mcp-server/`.
- **Dual-layout sidebar support** — Tasks and Decisions tree providers scan both `tasks/`/`decisions/` subdirectories (v1) and flat `TASK-*.md`/`ADR-*.md` files (v2).
- **YAML frontmatter parsing** — Sidebar providers extract status from YAML frontmatter (`status:` field) in addition to `**Status:**` pattern.
- **Git hook simplified** — `installGitHook()` is now a no-op (no SQLite DB to stage via pre-commit).
- **`ensureGitConfig()` simplified** — `.gitignore` only ignores `.mcp/*` (no DB negation rules, no WAL entries).
- **Init command updated** — Removed `.gitattributes` creation (`*.db binary` no longer needed). Simplified `.gitignore` template.
- **Server manager** — Only checks `.vscode/mcp.json` (removed `.mcp.json` references).

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
