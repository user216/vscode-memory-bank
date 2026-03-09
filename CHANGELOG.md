# Changelog — vscode-memory-bank

All notable changes to this project are documented here. Each component (extension, MCP server, layers) has its own section.

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
