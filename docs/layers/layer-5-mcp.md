# Layer 5: MCP Server

**Status:** Built
**VS Code Primitive:** MCP Servers (`.vscode/mcp.json`)
**Dependencies:** Layers 0-4
**Directory:** `mcp/`

## What It Does

Layer 5 adds a Model Context Protocol server that provides capabilities beyond what file-based tools can offer. While Layers 0-4 work entirely through file read/write operations and shell scripts, the MCP server provides structured queries, full-text search, token budgeting, and knowledge graph operations.

Markdown files remain the source of truth. The MCP server syncs them into SQLite + FTS5 on startup and watches for changes.

## What It Adds Over Layers 0-4

| Feature | Layers 0-4 | Layer 5 |
|---------|------------|---------|
| Search across memories | Grep/file read (reads entire files) | FTS5 full-text search with highlighted excerpts |
| Token budgeting | Agent guesses what fits | Server calculates token costs, trims to budget |
| Knowledge graph queries | Manual file cross-referencing | Typed relationships with graph traversal |
| Structured queries | Read files, parse manually | Query by type, status, date range |
| Concurrent sessions | File locking issues possible | SQLite WAL mode handles concurrency |
| Cross-references | Manual | Auto-detected from ADR-NNNN / TASK-NNN patterns |

## Architecture

```
VS Code Copilot (Claude Opus latest)
    │
    ├── MCP tools (structured queries)
    │       │
    │       ▼
    │   MCP Server (TypeScript, stdio mode)
    │       │
    │       ▼
    │   SQLite + FTS5 (read cache)
    │       │
    │       ▼ syncs from
    │   memory-bank/*.md files (source of truth)
    │
    └── File tools (fallback, always available)
            │
            ▼
        memory-bank/*.md files
```

## Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `memory_search` | Full-text search across all memory bank content | `query`, `type?`, `limit?` |
| `memory_query` | Structured queries by type, status, date range | `type?`, `status?`, `since?`, `until?` |
| `memory_recall` | Token-budgeted context retrieval for session start | `budget?`, `priority?` (foundational/recent/active) |
| `memory_link` | Create typed relationships between memory items | `source`, `target`, `relation` |
| `memory_graph` | Traverse knowledge graph from a starting item | `item`, `depth?`, `direction?` |
| `memory_schema` | Self-describing schema for tool discovery | (none) |

### `memory_recall` Priority Strategies

- **foundational** — projectbrief first, then productContext, systemPatterns, techContext, activeContext, progress, tasks, decisions
- **recent** — most recently updated items first
- **active** — activeContext first, then in-progress tasks, then proposed decisions, then everything else

## File Structure

```
mcp/
├── package.json
├── tsconfig.json
├── .gitignore
├── src/
│   ├── index.ts              # Entry point: create server, register tools, connect stdio
│   ├── db.ts                 # SQLite schema, connection, WAL mode
│   ├── sync.ts               # Markdown → SQLite sync + file watcher
│   ├── parser.ts             # Markdown parser (metadata, sections, cross-refs)
│   ├── types.ts              # Shared TypeScript types
│   └── tools/
│       ├── memory-search.ts  # FTS5 full-text search
│       ├── memory-query.ts   # Structured queries
│       ├── memory-recall.ts  # Token-budgeted retrieval
│       ├── memory-link.ts    # Create relationships
│       ├── memory-graph.ts   # Graph traversal
│       └── memory-schema.ts  # Schema discovery
└── build/                    # Compiled JavaScript (git-ignored)
```

## Installation

### Build the server

```bash
cd mcp
npm install
npx tsc
```

### Configure in your project

Add to `.vscode/mcp.json` in any project that has a `memory-bank/` directory:

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

## Key Design Decisions

- **TypeScript** — aligns with VS Code / Claude Agent SDK ecosystem
- **SQLite + FTS5** — zero external dependencies, single-file database per workspace
- **Stdio transport** — simplest integration, no HTTP server to manage
- **Markdown sync** — MCP server reads the same markdown files from Layers 0-4, keeping them as source of truth
- **WAL mode** — better concurrent read performance
- **Auto cross-references** — scans content for ADR-NNNN / TASK-NNN patterns and creates links automatically

## Graceful Degradation

If the MCP server is not running or not configured:
- All Layer 0-4 functionality continues to work unchanged
- The agent falls back to file-based read/write for all memory operations
- No error messages — the MCP tools are simply not available

## Compatibility
- Target platform: VS Code + GitHub Copilot extension + Claude Agent SDK
- Model: Claude Opus (latest) — see `memory-bank-config.json`
- Server runs as a child process via stdio — no network ports, no Docker
- Dependencies: `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`
