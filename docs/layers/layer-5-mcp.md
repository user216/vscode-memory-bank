# Layer 5: MCP Server

**Status:** Planned
**VS Code Primitive:** MCP Servers (`.vscode/mcp.json`)
**Dependencies:** Layers 0-4
**Directory:** `mcp/` (future)

## What It Will Do

Layer 5 adds a Model Context Protocol server that provides capabilities beyond what file-based tools can offer. While Layers 0-4 work entirely through file read/write operations and shell scripts, the MCP server provides structured queries, full-text search, token budgeting, and knowledge graph operations.

This layer is only justified when the memory bank grows large enough that file-based search becomes insufficient, or when you need features like semantic search, relationship traversal, or token-aware context injection.

## What It Will Add Over Layers 0-4

| Feature | Layers 0-4 | Layer 5 |
|---------|------------|---------|
| Search across memories | Grep/file read (reads entire files) | FTS5 full-text search with column prefixes |
| Semantic search | Not possible | Local ONNX embeddings (no API calls) |
| Token budgeting | Agent guesses what fits | Server calculates token costs, trims responses |
| Knowledge graph queries | Manual file cross-referencing | Typed relationships with graph traversal |
| Deduplication | Agent does it ad-hoc | Server enforces uniquely |
| Concurrent sessions | File locking issues possible | Server handles concurrency |
| Import/export | Files ARE the format | Bidirectional markdown ↔ structured DB sync |

## Planned Architecture

```
VS Code Copilot (Claude Opus 4)
    │
    ├── MCP tools (structured queries)
    │       │
    │       ▼
    │   MCP Server (TypeScript, stdio mode)
    │       │
    │       ▼
    │   SQLite + FTS5
    │   └── Optional: local ONNX embeddings
    │
    └── File tools (fallback, always available)
            │
            ▼
        memory-bank/*.md files
```

## Key Design Decisions (to be formalized as ADRs)

- **TypeScript** — aligns with VS Code / Claude Agent SDK ecosystem
- **SQLite + FTS5** — zero external dependencies, single-file database per workspace
- **Stdio transport** — simplest integration, no HTTP server to manage
- **Markdown sync** — the MCP server reads/writes the same markdown files from Layers 0-4, keeping them as the source of truth
- **Local embeddings only** — no API calls for semantic search (privacy-first)

## Planned Tools

Based on research of ConPort, memory-keeper, and other MCP projects:

| Tool | Purpose |
|------|---------|
| `memory_search` | Full-text search across all memory bank content |
| `memory_query` | Structured queries by type, date, status |
| `memory_recall` | Token-budgeted context retrieval for session start |
| `memory_link` | Create typed relationships between memory items |
| `memory_graph` | Traverse knowledge graph from a starting item |
| `memory_schema` | Self-describing schema for tool discovery |

## Graceful Degradation

If the MCP server is not running or not configured:
- All Layer 0-4 functionality continues to work unchanged
- The agent falls back to file-based read/write for all memory operations
- No error messages — the MCP tools are simply not available

## Configuration (planned)

```json
// .vscode/mcp.json
{
  "servers": {
    "memory-bank": {
      "command": "npx",
      "args": ["vscode-memory-bank-mcp"],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

## Compatibility
- Target platform: VS Code + GitHub Copilot extension + Claude Agent SDK
- Model: Claude Opus 4
- Server runs as a child process via stdio — no network ports, no Docker
