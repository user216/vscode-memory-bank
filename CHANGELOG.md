# Changelog — vscode-memory-bank

All notable changes to this project are documented here. Each component (extension, MCP server, layers) has its own section.

## 2026-04-03

### MCP Server v2.4.0 — NOTE Type Removed (ADR-0025)

#### Removed
- **`memory_create_note` tool** — NOTE type has no unique niche; knowledge is stored in tasks, decisions, skills, instructions, and AI auto-memory
- **`"note"` from `ItemType`** — type union is now `"core" | "task" | "decision" | "structure"`
- **NOTE-NNN ID extraction** from `deriveId()` — NOTE filenames treated as plain stems
- **NOTE-NNN filename detection** from `deriveType()` — NOTE files classified as `"structure"`
- **`"note"` from type filter enums** in `memory_query` and `memory_search`
- **Note tier** from `memory_recall` active priority (4-tier: in-progress tasks → proposed decisions → projectbrief → other tasks → rest)
- **Note count** from `memory_status` output
- **`memory_create_note`** from `memory_schema` tools list and `"note"` from item types

#### Changed
- `deriveType()` fallback for unknown files changed from `"note"` to `"structure"`
- `memory_add_tag` example updated: `NOTE-001` removed from ID examples
- `memory_migrate_v1` warning messages no longer reference notes
- Tool count: 21 → 20

### Extension v0.7.0 — Notes Sidebar Removed (ADR-0025), .env Version Source (ADR-0026)

#### Removed
- **Notes sidebar view** (`memoryBankNotes`) — entire view registration removed from `package.json`
- **`NotesTreeProvider`** (`extension/src/sidebar/notes-provider.ts`) — deleted
- **Note type** from knowledge graph colors and legend
- **`NOTE-` pattern** from tree-provider filter, frontmatter-utils cross-ref regex, knowledge graph URI resolution

#### Changed
- Sidebar has 3 views: Tasks, Decisions, Files (was 4 with Notes)
- Knowledge graph legend: 4 colors (core, task, decision, structure)
- **`.env` is now single source of truth for versions** (ADR-0026) — `EXT_VERSION` + `MCP_VERSION` in `.env`; `sync-versions.js` reads from `.env` and propagates to `package.json`, MEMORY.md, sidebar title
- `scripts/sync-versions.js` rewritten: reads `.env`, detects drift in report mode
- `extension/scripts/auto-version.js` reads `EXT_VERSION` from `.env`

### Copilot Plugin v0.5.1 — Notes References Removed (ADR-0025)

#### Changed
- All skills, instructions, agents, and prompts updated to remove NOTE references
- `memory_create_note` removed from MCP tools tables
- `NOTE-*.md` removed from file scanning fallback lists and directory layout diagrams

## 2026-03-28

### Extension v0.6.3 — MCP Server Key Rename & Version Display

#### Changed
- **MCP server key renamed** from `"memory-bank"` to `"mbank-{workspace}"` (e.g. `mbank-my-project`) — avoids conflict with Claude's reserved `#memory` prefix
- **Legacy migration**: existing `"memory-bank"` keys in `.vscode/mcp.json` are automatically migrated to new `mbank-{workspace}` key, preserving user `env` settings
- **Sidebar title shows version**: "MEMORY BANK V0.6.3" baked into view container title at build time via `sync-versions.js`
- Copy-to-clipboard MCP config snippet now uses `mbank-{workspace}` key

#### Added
- **`deriveServerKey()`** in config-generator — derives clean per-workspace key from folder name
- **`scripts/sync-versions.js`** — centralized version management: `--bump`, `--set-ext`, `--set-mcp`, `--sync`; propagates to `package.json`, MEMORY.md, and view container title
- **`extension/scripts/auto-version.js`** — auto-bumps extension patch if VSIX with current version exists

### MCP Server v2.3.0 — Migration & Verification Fixes

#### Added
- **`extractStatus()` in parser.ts** — reusable 3-tier status extraction (YAML → bold → heading), shared by parser and verify engine
- **`resetStore()` in index-store.ts** — full in-memory store rebuild from disk, preserves object reference (watcher-safe)
- **README.md auto-creation** during v1→v2 migration (v1 memory-banks don't have one)
- **Pre-migration warnings** — dry_run mode warns if deprecated core files contain substantial content worth saving to a NOTE
- **User-created link preservation** — migration snapshots non-auto-detected links and restores them after store reset
- **`.mcp/` directory cleanup** — migration deletes orphaned SQLite database directory from pre-ADR-0016
- **16 new tests** (163 total): `extractStatus` (6), 3-tier verify status (5), `resetStore` (2), migration improvements (3)

#### Fixed
- `verifyAllDecisions` now uses 3-tier status parsing — no longer silently skips ADRs with `**Status:** Accepted` or `## Status: Accepted` (only YAML frontmatter was checked)
- Link count no longer drops during migration — `resetStore()` rebuilds full bidirectional cross-reference graph after all file moves
- Item count consistency after migration — full store rebuild ensures count matches filesystem

### Extension v0.6.0 — Build Automation

#### Added
- **`npm run package`** — auto-bumps patch version if VSIX with current version already exists, prevents same-version rebuilds
- **`scripts/bump-version.sh`** — unified version bump across MCP + extension package.json, compiles, bundles, and packages
- **`extension/README.md`** — marketplace details page with features, MCP tools table, commands, and setup instructions

## 2026-03-27

### MCP Server v2.2.0 — ADR Compliance Verification (ADR-0021)

#### Added
- **`memory_verify_decisions` MCP tool** — run compliance assertions embedded in accepted ADR `## Verification` sections against the codebase
- **`verify-assertions.ts`** — self-contained assertion engine (standalone, no MCP store dependency) supporting `FILE_EXISTS`, `FILE_NOT_EXISTS`, `CONTAINS`, `NOT_CONTAINS` assertion types
- **`adr-compliance.test.ts`** — vitest suite that verifies all accepted ADR assertions pass against real project codebase
- **`## Verification` sections** added to 6 accepted ADRs (ADR-0012, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0020) with HTML comment assertions
- **ADR-0021** — documents the 3-layer verification system with self-referential assertions

### Extension v0.5.0 — v2 Artifact Updates

#### Changed
- All hooks (`session-start.sh`, `session-stop.sh`, `pre-compact.sh`) rewritten for v2 flat layout — no longer reference `activeContext.md`, `progress.md`, or `tasks/_index.md`
- `session-start.sh` now runs ADR assertion checks at session start, printing warnings for failed assertions
- `instructions/memory-bank.instructions.md` updated to v2: removed v1 file references, added `memory_verify_decisions` tool, deprecated `memory_save_context`

### Copilot Plugin v0.5.0 — v2 Overhaul

#### Changed
- All hooks, instructions, skills, prompts, and agents updated from v1 to v2
- Removed all references to `activeContext.md`, `progress.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `tasks/_index.md`, `decisions/_index.md`
- Skills: SKILL.md + templates updated to v2 YAML frontmatter format
- Prompts: all 4 prompt files reference flat `TASK-*.md`/`ADR-*.md`/`NOTE-*.md` layout
- Agents: `memory-planner` and `memory-worker` fallback reads updated to v2 file layout
- Instructions: `memory-bank.instructions.md` rewritten with v2 core files, MCP table, and flat layout diagram

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
