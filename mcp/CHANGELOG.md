# Changelog — MCP Server

## 1.0.0

### Added
- **6 MCP tools** for structured memory bank access:
  - `memory_recall`: Token-budgeted context retrieval with priority strategies (foundational, recent, active)
  - `memory_search`: Full-text search across all memory bank content using FTS5
  - `memory_query`: Structured query by type, status, or date range
  - `memory_link`: Create typed relationships between memory bank items
  - `memory_graph`: Traverse the knowledge graph from a starting item
  - `memory_schema`: Returns the data model (item types, statuses, relation types)
- **SQLite + FTS5** backend for fast full-text search
- **Automatic sync**: Watches markdown files and syncs changes into SQLite on startup
- **Knowledge graph**: Link items with typed relations (implements, supersedes, blocks, depends-on, references)
- **Token budgeting**: `memory_recall` fits content within a specified token budget using priority strategies
- **65 tests** covering all tools, database sync, FTS5 search, graph traversal, and edge cases
- **stdio transport** for MCP protocol communication
