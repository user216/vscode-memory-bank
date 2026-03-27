# Changelog — MCP Server

## 2.0.0

### Changed
- **Replaced SQLite + FTS5 with MiniSearch + gray-matter** — zero native dependencies (ADR-0016)
- In-memory index: `Map<string, ParsedItem>` + MiniSearch (BM25, prefix, fuzzy) + adjacency lists
- YAML frontmatter parsing via `gray-matter`, with backward-compatible `**Key:** Value` fallback
- Wikilink `[[ID]]` extraction and inline `#tag` parsing
- File watching via `chokidar` for incremental index updates

### Added
- `memory_status`: Summary of memory bank state
- `memory_tags`: List all tags across items
- `memory_create_note`: Create knowledge notes
- `memory_save_context`: Persist active context
- `memory_import_decisions`: Batch import decisions from structured text
- `memory_update_decision`: Update decision status and content

### Removed
- SQLite database (`better-sqlite3`, `db.js`, `sync.js`)
- All native compilation requirements

## 1.1.0

### Added
- `memory_unlink`: Delete a relationship between two memory bank items
- `memory_update_link`: Update the relation type of an existing link

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
