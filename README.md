# vscode-memory-bank

A 7-layer memory bank toolkit for **VS Code + GitHub Copilot + Claude Agent SDK**. Gives AI coding sessions persistent project context that survives across sessions.

Built on the [original memory-bank instruction](https://github.com/cline/cline-docs/blob/main/prompting/custom%20instructions%20library/cline_docs/cline_docs.md) from the awesome-copilot community — fully backward-compatible, with additive enhancements only.

## Problem

AI assistants lose all context between sessions. Every new chat starts from zero. Existing solutions are either too simple (a single instruction file) or too complex (full database server). This project fills the gap with a layered approach: start with a single file, add capabilities as needed.

## Architecture

7 layers of progressive enhancement. Each layer is optional and works without the layers above it:

| Layer | Primitive | What It Does | Status |
|-------|-----------|-------------|--------|
| 0 | Custom Instruction | Base memory bank behavior — read/write markdown files | Built |
| 1 | Agent Skill | Auto-detected capability with templates and progressive loading | Built |
| 2 | Prompt Files | `/memory-init`, `/memory-update`, `/memory-review`, `/memory-task` commands | Built |
| 3 | Custom Agents | Memory Planner (plan mode) + Memory Worker (act mode) with handoffs | Built |
| 4 | Hooks | Session lifecycle automation (inject context, preserve on compact, save on exit) | Built |
| 5 | MCP Server | Structured search, token budgeting, knowledge graph (SQLite + FTS5) | Built |
| 6 | VS Code Extension | Sidebar UI, status bar, file watchers, one-click install | Planned |

See [docs/architecture.md](docs/architecture.md) for the full design and [docs/layers/](docs/layers/) for per-layer documentation.

## Quick Start

### Layer 0 only (simplest)

Copy the instruction file to your project:

```bash
mkdir -p .github/instructions
cp instructions/memory-bank.instructions.md .github/instructions/
```

Then tell your AI: "initialize memory bank". It will create the `memory-bank/` folder with all core files.

### Layers 0-2 (recommended starting point)

```bash
mkdir -p .github/instructions
cp instructions/memory-bank.instructions.md .github/instructions/

mkdir -p .github/prompts
cp prompts/*.prompt.md .github/prompts/
```

This gives you the base behavior plus four slash commands:
- `/memory-init` — initialize memory bank for a new project
- `/memory-update` — update all memory files to reflect current state
- `/memory-review` — read and summarize full project context
- `/memory-task` — create, update, or query tasks

### Layers 0-4 (full current feature set)

```bash
mkdir -p .github/instructions
cp instructions/memory-bank.instructions.md .github/instructions/

mkdir -p .github/prompts
cp prompts/*.prompt.md .github/prompts/

mkdir -p .github/copilot/agents
cp agents/*.agent.md .github/copilot/agents/

mkdir -p .github/copilot/skills
cp -r skills/managing-memory-bank .github/copilot/skills/

cp hooks/memory-hooks.json .vscode/memory-hooks.json
cp -r hooks/scripts .vscode/hooks-scripts
```

> **Note:** Hook scripts require `jq` to be installed (`sudo apt install jq`).

## Memory Bank Structure

The memory bank stores context in markdown files inside `memory-bank/`:

```
memory-bank/
├── projectbrief.md        # Foundation — goals, scope, requirements
├── productContext.md       # Why the project exists, user problems
├── systemPatterns.md       # Architecture, design patterns, conventions
├── techContext.md          # Tech stack, dependencies, constraints
├── activeContext.md        # Current focus, recent changes, next steps
├── progress.md             # What works, what remains, known issues
├── tasks/                  # Individual task files with progress logs
│   └── _index.md
└── decisions/              # ADRs — immutable decision history
    └── _index.md
```

Files form a dependency hierarchy: `projectbrief.md` is the foundation, all others derive from it. The agent reads all files at session start and updates them as work progresses.

## Agents

Two custom agents with handoff support:

- **Memory Planner** — reads context, develops implementation strategy, never edits source code. Hands off to Worker.
- **Memory Worker** — executes plans, writes code, updates memory bank with progress. Hands off back to Planner.

## Model Configuration

Agents do **not** pin a model version — they inherit your VS Code Copilot default. The project is designed for **Claude Opus (latest)**.

`memory-bank-config.json` documents the recommended model. If you want to explicitly pin a version in agent files, use:

```bash
./scripts/update-model.sh "Claude Opus 5"
```

See [ADR-0004](memory-bank/decisions/ADR-0004-no-model-version-pinning.md) for the rationale.

## Requirements

- VS Code with GitHub Copilot extension
- Claude Agent SDK (Claude models only)
- `jq` for hook scripts (Layer 4)
- Node.js 20+ for MCP server (Layer 5)

## MCP Server (Layer 5)

Six tools for structured memory access:

| Tool | Purpose |
|------|---------|
| `memory_search` | Full-text search with FTS5 (AND, OR, NOT, prefix*) |
| `memory_query` | Structured query by type, status, date range |
| `memory_recall` | Token-budgeted context retrieval with priority strategies |
| `memory_link` | Create typed relationships between items |
| `memory_graph` | Traverse knowledge graph from a starting item |
| `memory_schema` | Self-describing schema for tool discovery |

Build and configure:

```bash
cd mcp && npm install && npx tsc
```

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "memory-bank": {
      "command": "node",
      "args": ["/path/to/vscode-memory-bank/mcp/build/index.js"],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

## Testing

```bash
cd mcp && npm test
```

65 tests across 3 test files:
- **parser.test.ts** — 28 tests: ID derivation, type inference, metadata extraction, sections, cross-references
- **db-sync.test.ts** — 17 tests: schema creation, file sync, FTS5 indexing, cross-ref link detection, re-sync
- **tools.test.ts** — 20 tests: search, query, recall strategies, link creation, graph traversal, schema

## Design Decisions

Documented as ADRs in `memory-bank/decisions/`:

- **ADR-0001** — Additive compatibility with original instruction (never delete features)
- **ADR-0002** — 7-layer progressive enhancement architecture
- **ADR-0003** — Memory bank replaces PRD; ADRs kept for immutable decision history
- **ADR-0004** — No model version pinning in agent files

## Research Sources

This project synthesizes ideas from 9+ existing memory/context solutions:

- [awesome-copilot memory-bank instruction](https://github.com/cline/cline-docs) — original instruction (Layer 0 foundation)
- [GreatScottyMac/context-portal](https://github.com/GreatScottyMac/context-portal) — ADR integration, structured context
- [mem0ai/mem0](https://github.com/mem0ai/mem0) — intelligent memory layer patterns
- [mkreyman/mcp-memory-keeper](https://github.com/mkreyman/mcp-memory-keeper) — MCP-based memory persistence
- And others listed in [docs/architecture.md](docs/architecture.md)

## License

Apache License 2.0
