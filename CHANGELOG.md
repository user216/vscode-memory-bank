# Changelog — vscode-memory-bank

All notable changes to this project are documented here. Each component (extension, MCP server, layers) has its own section.

## 2026-03-27

### MCP Server v2.0.0 — Zero Native Dependencies (ADR-0015, ADR-0016)

**Breaking:** Replaced SQLite (`better-sqlite3`) with pure TypeScript in-memory index using MiniSearch. No native dependencies, no runtime `npm install`.

#### Added
- **`index-store.ts`** — In-memory `Map<string, ParsedItem>` + MiniSearch full-text search + adjacency lists for graph
- **YAML frontmatter parsing** — `gray-matter` parses `---` delimited metadata (v1 `**Key:** Value` still supported)
- **Wikilink extraction** — `[[TASK-001]]` references parsed into graph edges
- **Inline tag extraction** — `#topic` tags from body text merged with frontmatter tags
- **`memory_status` tool** — Computed aggregates: task/decision counts by status, tag cloud, link count
- **`memory_tags` tool** — List all tags with counts, or filter items by tag
- **`memory_create_note` tool** — Create NOTE-NNN.md files with YAML frontmatter
- **99 tests** across 4 test files (parser, index-store, tools, write-tools)

#### Removed
- `mcp/src/db.ts` — SQLite initialization/schema (replaced by `index-store.ts`)
- `mcp/src/sync.ts` — Markdown-to-SQLite sync logic (unnecessary with in-memory index)
- `better-sqlite3` runtime dependency (7.5MB native binary)
- `@types/better-sqlite3` dev dependency

#### Changed
- All 14 tool files updated: SQL queries → Map/array operations
- `memory_search` uses MiniSearch + `generateExcerpt()` (replaces FTS5 `MATCH`/`snippet()`)
- `memory_query` uses `Array.from(store.items.values()).filter()` (replaces SQL `WHERE`)
- `memory_graph` BFS traversal over adjacency lists (replaces SQL BFS)
- `parser.ts` supports both YAML frontmatter and v1 `**Key:** Value` metadata
- `deriveType()` supports flat layout patterns (`TASK-NNN`, `ADR-NNNN`, `NOTE-NNN`)

### Extension v0.3.1

#### Added
- **MCP Setup sidebar section** — shows "GitHub Copilot" (auto-configured) and "Claude Code / Other" (click to copy config to clipboard)
- **`memoryBank.copyMcpConfig` command** — copies MCP config JSON snippet to clipboard

#### Changed
- **Eliminated runtime `npm install`** — all MCP server dependencies are pure JS, bundled at build time
- **Stopped generating `.mcp.json`** — Claude Agent SDK no longer uses it; only `.vscode/mcp.json` generated for Copilot (ADR-0006 deprecated)
- **Config generator won't overwrite** — skips writing `.vscode/mcp.json` if `memory-bank` entry already exists
- `McpServerBootstrap` simplified: removed `install()` method, `isReady()` just checks `index.js` exists
- `bundle-mcp.js` now runs `npm install --production` at build time to bundle deps into VSIX
- Sidebar tasks/decisions providers support both v1 (`tasks/`, `decisions/`) and v2 (flat `TASK-*.md`, `ADR-*.md`) layouts
- Sidebar providers parse YAML frontmatter for status in addition to `**Status:**` pattern
- Git hook simplified: no-op (no SQLite DB to stage)
- Init command: simplified `.gitignore` (no DB entries), removed `.gitattributes` creation
- Server manager: only checks `.vscode/mcp.json` (removed `.mcp.json` references)

### Copilot Plugin v0.4.0 (ADR-0017)

#### Removed
- Bundled MCP server (`mcp-server-build/`) — now delivered exclusively by the VS Code extension
- `setup.sh`, `start-mcp.sh`, `.mcp.json` — no longer needed
- Plugin is now skills + agents + hooks + prompts only

## 2025-03-09

### Extension v0.2.0
- Added Knowledge Graph webview with interactive force-directed visualization
- Added MCP server lifecycle manager (start/stop/toggle from VS Code)
- See [extension/CHANGELOG.md](extension/CHANGELOG.md) for details

### Layers 0-3: MCP-first instructions
- Updated all instruction files to prioritize MCP tools over raw file reads
- Updated skill, prompts, and agents with MCP-first startup protocol and fallback paths
- Generic tool references (no project/server names hardcoded)

## 2025-03-08

### Extension v0.1.0
- Initial VS Code extension with sidebar (Files, Tasks, Decisions), status bar, commands, file watcher
- See [extension/CHANGELOG.md](extension/CHANGELOG.md) for details

### MCP Server v1.0.0
- Initial MCP server with 6 tools, SQLite + FTS5, 65 tests
- See [mcp/CHANGELOG.md](mcp/CHANGELOG.md) for details

### Layers 0-5
- Layer 0: Custom instruction file (additive extension of original memory-bank.instructions.md)
- Layer 1: Agent skill with templates (projectbrief, task, decision)
- Layer 2: Prompt files (`/memory-init`, `/memory-update`, `/memory-review`, `/memory-task`)
- Layer 3: Custom agents (Memory Planner + Memory Worker with handoffs)
- Layer 4: Hook scripts (SessionStart, PreCompact, Stop) — all `jq`-optional
- Layer 5: MCP server (see above)

### Fixes
- Test isolation: `db-sync.test.ts` uses temp directories to avoid vitest parallel race conditions
- `update-model.sh`: handles agents without `model:` field, supports `--remove` flag, `jq`-optional
- Hook scripts: `jq`-optional fallbacks, stop hook infinite loop prevention via marker file
- Planner agent: added `tools` declaration, structured plan output format
- Worker agent: added "run tests after changes" rule

## 2025-03-07

### Initial scaffolding
- Repository created with 7-layer architecture
- Layers 0-4 built (instructions, skill, prompts, agents, hooks)
- README.md with quick start and architecture overview
- 4 ADRs (compatibility, architecture, no-PRD, no-model-pinning)
- Centralized model config (`memory-bank-config.json` + `scripts/update-model.sh`)
