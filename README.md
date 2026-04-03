# vscode-memory-bank

Persistent AI project memory for **VS Code + GitHub Copilot + Claude Code**. Gives AI coding sessions structured context that survives across sessions — tasks, decisions, and a knowledge graph, all in markdown.

## The Problem

AI assistants lose all context between sessions. Every new chat starts from zero — you re-explain your architecture, re-describe your conventions, re-state what you're working on. Memory Bank solves this with a `memory-bank/` folder of structured markdown files that your AI reads at session start and updates as you work.

## Quick Start

### VS Code Extension (recommended)

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=memory-bank.vscode-memory-bank)
2. Open a workspace
3. Click **Initialize Memory Bank** in the sidebar
4. The MCP server is auto-configured for GitHub Copilot — no manual setup needed
5. For Claude Code, click **MCP Setup** in the sidebar and copy the config snippet

### Copilot Agent Plugin (without extension)

For teams that want skills, prompts, agents, and hooks without the VS Code extension:

```bash
git submodule add https://github.com/user216/memory-bank-plugin .github/copilot/plugins/memory-bank
```

Then add to `.vscode/settings.json`:

```json
{
  "chat.pluginLocations": [".github/copilot/plugins/memory-bank"]
}
```

### Manual Setup (layers 0-2)

```bash
mkdir -p .github/instructions
cp instructions/memory-bank.instructions.md .github/instructions/

mkdir -p .github/prompts
cp prompts/*.prompt.md .github/prompts/
```

This gives you slash commands: `/memory-init`, `/memory-update`, `/memory-review`, `/memory-task`.

## Architecture

7 layers of progressive enhancement. Each layer is optional and works without the layers above it:

| Layer | Primitive | What It Does | Status |
|-------|-----------|-------------|--------|
| 0 | Custom Instruction | Base memory bank behavior — read/write markdown files | Built |
| 1 | Agent Skill | Auto-detected capability with templates and progressive loading | Built |
| 2 | Prompt Files | `/memory-init`, `/memory-update`, `/memory-review`, `/memory-task` commands | Built |
| 3 | Custom Agents | Memory Planner (plan mode) + Memory Worker (act mode) with handoffs | Built |
| 4 | Hooks | Session lifecycle automation (inject context, preserve on compact, save on exit) | Built |
| 5 | MCP Server | In-memory MiniSearch index, 21 tools, knowledge graph, ADR verification | Built |
| 6 | VS Code Extension | Sidebar UI, status bar, knowledge graph, MCP auto-config | Built |

## Memory Bank Structure

Files use YAML frontmatter for metadata and a flat naming convention:

```
memory-bank/
  projectbrief.md        # Project goals, scope, requirements
  README.md              # Navigation index with wikilinks
  TASK-001.md            # Task files with status, tags, progress logs
  ADR-0001.md            # Architecture Decision Records
```

Example frontmatter:

```yaml
---
type: task
status: In Progress
tags: [backend, auth]
related: [ADR-0001]
created: 2026-03-15
---
# TASK-014: Implement OAuth2 login flow
```

## VS Code Extension

The extension provides:

- **Sidebar** — browse tasks (sorted by status), decisions, and files with titles, tags, and expandable relations
- **Knowledge Graph** — interactive force-directed visualization of item relationships
- **Status Bar** — shows current focus derived from in-progress tasks
- **MCP Setup** — auto-configures the MCP server for GitHub Copilot; one-click copy for Claude Code

## MCP Server

20 tools for structured memory access. The server uses an in-memory MiniSearch index with BM25 ranking — zero native dependencies.

| Tool | Purpose |
|------|---------|
| `memory_recall` | Token-budgeted context retrieval with priority strategies |
| `memory_search` | Full-text search with BM25 ranking, prefix/fuzzy matching |
| `memory_query` | Structured query by type, status, date range |
| `memory_create_task` | Create task with auto-generated TASK-NNN ID |
| `memory_create_decision` | Create ADR with standard format and auto-generated ID |
| `memory_update_status` | Update task/decision status with timestamped progress logs |
| `memory_bulk_update_status` | Batch status updates for multiple items |
| `memory_add_tag` | Add a tag to any item's YAML frontmatter |
| `memory_update_decision` | Update ADR content (context, decision, alternatives) |
| `memory_import_decisions` | Import external ADR files into the memory bank |
| `memory_link` | Create typed directional relationship between items |
| `memory_unlink` | Remove a relationship between items |
| `memory_update_link` | Change the relation type of an existing link |
| `memory_graph` | BFS traversal of the knowledge graph with configurable depth |
| `memory_tags` | List all tags with counts, or items with a specific tag |
| `memory_status` | Project status: task/decision counts by status |
| `memory_schema` | Self-describing data model for tool discovery |
| `memory_verify_decisions` | Run compliance assertions from accepted ADR `## Verification` sections |
| `memory_migrate_v1` | Migrate v1 layout (subdirectories) to v2 flat layout |
| `memory_save_context` | *(deprecated)* — use `memory_update_status` with `log_entry` |

### Standalone MCP Setup

If using the MCP server without the extension:

```bash
cd mcp && npm install && npm run build
```

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mbank": {
      "command": "node",
      "args": ["/path/to/vscode-memory-bank/mcp/build/index.js"],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

## Agents

Two custom agents with handoff support:

- **Memory Planner** — reads context, develops implementation strategy, never edits source code
- **Memory Worker** — executes plans, writes code, updates memory bank with progress

## Requirements

- VS Code 1.95+ with GitHub Copilot or Claude Code
- Node.js 20+ (bundled with extension; needed standalone for MCP server)

## Testing

```bash
# MCP server tests
cd mcp && npm test

# Extension bundle tests
cd extension && npm test
```

## Design Decisions

Documented as ADRs in `memory-bank/`:

- **ADR-0001** — Additive compatibility with original memory bank instruction
- **ADR-0002** — 7-layer progressive enhancement architecture
- **ADR-0015** — v2 Obsidian-Zettelkasten architecture (flat layout, YAML frontmatter, wikilinks)
- **ADR-0016** — MiniSearch + gray-matter (zero native deps, replaced SQLite)
- **ADR-0017** — Plugin doesn't bundle MCP server (extension delivers it)
- **ADR-0021** — 3-layer ADR compliance verification
- **ADR-0022** — MCP server key renamed to `mbank-{workspace}`

## Research Sources

Built on the [original memory-bank instruction](https://github.com/cline/cline-docs/blob/main/prompting/custom%20instructions%20library/cline_docs/cline_docs.md) from the awesome-copilot community, with ideas from [context-portal](https://github.com/GreatScottyMac/context-portal), [mem0](https://github.com/mem0ai/mem0), [mcp-memory-keeper](https://github.com/mkreyman/mcp-memory-keeper), and others listed in [docs/architecture.md](docs/architecture.md).

## License

Apache License 2.0
