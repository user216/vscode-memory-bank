# ADR-0016: Eliminate SQLite — Zero Native Dependencies

**Status:** Accepted
**Date:** 2026-03-27
**Deciders:** Project maintainer
**Depends on:** ADR-0015 (v2 architecture)

## Context

The memory-bank MCP server currently depends on `better-sqlite3`, a Node.js native addon that bundles a compiled SQLite binary. This dependency:

1. **Requires native compilation** — `npm install` runs `node-gyp` to build C/C++ code, needing Python, a C compiler, and `make` on the user's machine
2. **Platform-specific binaries** — prebuilt binaries exist for common platforms, but fail on uncommon architectures, musl-based distros (Alpine), or when prebuild download is blocked by corporate proxies
3. **#1 source of install friction** — based on user feedback, `npm install` failures with `better-sqlite3` are the most common installation problem
4. **Runtime-installed in extension** — ADR-0012's auto-setup runs `npm install --production` at extension activation time specifically because `better-sqlite3` can't be bundled into a VSIX (native binary + NAPI)
5. **Unnecessary at memory-bank scale** — a typical memory-bank has 20-200 files totaling under 1MB of text. SQLite's strengths (concurrent writes, ACID transactions, billion-row scalability) are irrelevant here.

The question: can we replace SQLite entirely with a pure JavaScript in-memory index, eliminating all native dependencies?

## Decision

**Replace `better-sqlite3` + SQLite with a pure TypeScript in-memory index using `MiniSearch` for full-text search.**

The MCP server becomes a zero-native-dependency package that can be bundled directly into the VS Code extension VSIX, eliminating the runtime `npm install` step entirely.

### What SQLite Currently Provides

| SQLite Feature | Usage in memory-bank | Replacement |
|---------------|---------------------|-------------|
| `items` table | Store parsed markdown items | `Map<string, ParsedItem>` |
| `items_fts` (FTS5) | Full-text search with `MATCH` and `snippet()` | MiniSearch (pure JS, 7KB) |
| `links` table | Typed relationships between items | `Map<string, Set<{target, relation}>>` adjacency list |
| SQL `WHERE` filtering | `memory_query` by type, status, date | Array filter/sort on Map values |
| SQL `COUNT(*)` | Aggregate counts for `memory_status` | Computed from Map size |
| WAL mode | Concurrent read performance | N/A (single-process, in-memory) |
| ACID transactions | Atomic writes | N/A (writes go to .md files; index is derived) |
| `synced_at` tracking | Detect stale items | `fs.statSync` mtime comparison |

### In-Memory Index Architecture

```typescript
// index-store.ts — replaces db.ts + sync.ts

import MiniSearch from "minisearch";

interface IndexStore {
  // Primary storage: parsed items keyed by ID
  items: Map<string, ParsedItem>;

  // Full-text search index
  search: MiniSearch<ParsedItem>;

  // Graph: adjacency list for links
  //   outgoing: source → [{target, relation}]
  //   incoming: target → [{source, relation}]
  outgoing: Map<string, Array<{target: string; relation: string}>>;
  incoming: Map<string, Array<{source: string; relation: string}>>;

  // Tag index: tag → Set<itemId>
  tags: Map<string, Set<string>>;
}
```

#### Startup sequence
1. Scan memory-bank directory for all `.md` files
2. Parse each file (YAML frontmatter + body)
3. Insert into `items` Map
4. Add to MiniSearch index
5. Extract wikilinks `[[ID]]` → add to adjacency lists
6. Extract `related:` frontmatter → add to adjacency lists
7. Extract `tags:` frontmatter → populate tag index
8. Start `fs.watch` on directory for incremental updates

**Estimated startup time** for 200 files: <50ms (parsing is CPU-bound, no I/O bottleneck)

#### Incremental updates
File change events from `fs.watch`:
- **Created/Modified:** Re-parse file, update Map entry, update MiniSearch (`remove` + `add`), update adjacency lists
- **Deleted:** Remove from Map, remove from MiniSearch, remove all edges involving this item, clean up tag index

### MiniSearch Configuration

```typescript
const search = new MiniSearch<ParsedItem>({
  fields: ["title", "content"],      // Indexed fields
  storeFields: ["id", "title", "type"], // Stored for results
  searchOptions: {
    boost: { title: 3 },             // Title matches rank higher
    fuzzy: 0.2,                      // Typo tolerance
    prefix: true,                    // Prefix matching
  },
});
```

MiniSearch provides:
- **Prefix search**: `auth*` matches "authentication", "authorization"
- **Fuzzy search**: handles typos within edit distance
- **Field boosting**: title matches rank above body matches
- **Boolean operators**: AND, OR (via `combineWith` option)
- **Scoring**: BM25-based relevance ranking

**What MiniSearch lacks vs FTS5:**
- No `snippet()` function — excerpt generation must be implemented (simple: find match position, extract surrounding context)
- No `NEAR` operator — rarely used in practice
- No custom tokenizers — default tokenizer handles English well; CJK would need additional work

### Snippet Generation (replacing FTS5 `snippet()`)

```typescript
function generateExcerpt(content: string, query: string, maxLength = 200): string {
  const terms = query.toLowerCase().split(/\s+/);
  const lower = content.toLowerCase();

  // Find first occurrence of any search term
  let bestPos = 0;
  for (const term of terms) {
    const pos = lower.indexOf(term);
    if (pos !== -1) { bestPos = pos; break; }
  }

  // Extract window around match
  const start = Math.max(0, bestPos - 50);
  const end = Math.min(content.length, start + maxLength);
  let excerpt = content.slice(start, end).trim();

  // Add ellipsis
  if (start > 0) excerpt = "..." + excerpt;
  if (end < content.length) excerpt += "...";

  // Highlight matches with >>> / <<<
  for (const term of terms) {
    const re = new RegExp(`(${term})`, "gi");
    excerpt = excerpt.replace(re, ">>>$1<<<");
  }

  return excerpt;
}
```

### Graph Traversal (replacing SQL BFS)

The existing `memory_graph` tool uses SQL queries with iterative BFS. The replacement uses the adjacency list directly:

```typescript
function traverseGraph(
  startId: string,
  depth: number,
  direction: "outgoing" | "incoming" | "both",
  store: IndexStore,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visited = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const queue: Array<{ id: string; level: number }> = [{ id: startId, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id) || level > depth) continue;
    visited.add(id);

    const item = store.items.get(id);
    if (item) nodes.push({ id, title: item.title, type: item.type });

    if (level < depth) {
      if (direction !== "incoming") {
        for (const edge of store.outgoing.get(id) || []) {
          edges.push({ source: id, target: edge.target, relation: edge.relation });
          if (!visited.has(edge.target)) queue.push({ id: edge.target, level: level + 1 });
        }
      }
      if (direction !== "outgoing") {
        for (const edge of store.incoming.get(id) || []) {
          edges.push({ source: edge.source, target: id, relation: edge.relation });
          if (!visited.has(edge.source)) queue.push({ id: edge.source, level: level + 1 });
        }
      }
    }
  }

  return { nodes, edges };
}
```

**Performance:** At 200 items with ~500 edges, BFS completes in microseconds. No index optimization needed.

## Files Changed

### Deleted
| File | Reason |
|------|--------|
| `mcp/src/db.ts` | SQLite initialization, schema, connection management — all eliminated |
| `mcp/src/sync.ts` | Markdown → SQLite sync logic — unnecessary when index is rebuilt from files |
| `.mcp/memory-bank.db` | The SQLite database file itself |
| `.mcp/memory-bank.db-wal` | WAL journal |
| `.mcp/memory-bank.db-shm` | Shared memory file |

### Added
| File | Purpose |
|------|---------|
| `mcp/src/index-store.ts` | In-memory index: Map + MiniSearch + adjacency lists + tag index |
| `mcp/src/frontmatter.ts` | YAML frontmatter parser (using `gray-matter` or minimal custom parser) |

### Modified
| File | Change |
|------|--------|
| `mcp/src/parser.ts` | Parse YAML frontmatter instead of `**Key:** Value` metadata |
| `mcp/src/tools/*.ts` | All tools: `getDb()` → `getStore()` calls, SQL → Map/array operations |
| `mcp/package.json` | Remove `better-sqlite3`, add `minisearch` + `gray-matter` |
| `extension/src/mcpServerBootstrap.ts` | Remove `npm install` step — MCP server is now directly bundleable |

### Dependency Changes

| Operation | Package | Size | Native? |
|-----------|---------|------|---------|
| **Remove** | `better-sqlite3` | 7.5MB (with prebuilt binary) | Yes (C/C++, node-gyp) |
| **Remove** | `@types/better-sqlite3` | 50KB | No |
| **Add** | `minisearch` | 7KB (gzipped) | No |
| **Add** | `gray-matter` | 30KB | No |

**Net effect:** -7.5MB, eliminate native compilation entirely.

## Alternatives Considered

### Keep SQLite but use sql.js (WASM)
`sql.js` compiles SQLite to WebAssembly — no native deps. Already used in the `db-viewer` fork.

**Why not:** Adds ~750KB WASM binary. Still requires loading/persisting a `.db` file. Solves the native dep problem but not the "opaque binary vs indexable files" problem from ADR-0014.

### Use LevelDB / RocksDB wrappers
`level` package provides a key-value store with optional persistent backends.

**Why not:** Still binary storage format, still a dependency. Memory-bank's data model is simple enough that a `Map` is sufficient.

### Use SQLite with better-sqlite3 as optional accelerator
Keep the in-memory index as primary, optionally persist to SQLite for faster restarts.

**Why not:** Dual code paths increase complexity. At 200 files, cold-start parsing (<50ms) makes caching unnecessary. The complexity cost of maintaining two index backends exceeds the benefit.

## Consequences

### Positive
- **Zero native dependencies** — `npm install` never fails due to compilation issues
- **Directly bundleable** — MCP server can be included in VSIX without runtime `npm install`
- **Faster cold start** — parsing 200 .md files is faster than opening SQLite + querying
- **Simpler architecture** — one code path, no sync logic, no "is DB stale?" questions
- **Smaller install footprint** — 37KB of JS dependencies vs 7.5MB of native binary
- **Better testability** — in-memory index is trivially mockable; no temp DB files in tests
- **Platform-independent** — works on any OS/architecture that runs Node.js

### Negative
- **No persistence of index** — rebuilt on every server start (but at <50ms, this is imperceptible)
- **No SQL query language** — developers familiar with SQLite lose ad-hoc SQL querying capability
- **Memory usage** — all items in memory (but at <1MB for 200 files, this is negligible)
- **Search quality ceiling** — MiniSearch is good but FTS5 has more sophisticated ranking for complex queries

### Neutral
- Links (graph edges) created via `memory_link` tool must be persisted somewhere — they go into the `related:` frontmatter of the source file, making the file truly self-contained
- The `.mcp/` directory may still exist for other tooling artifacts but no longer contains a database
- This decision does not preclude adding SQLite back as an optional optimization if memory-banks grow significantly larger (500+ files)

## References
- ADR-0014: Storage Format Analysis — Markdown vs Database
- ADR-0015: Memory Bank v2 Architecture — Obsidian-Zettelkasten Paradigm
- MiniSearch: lightweight full-text search (github.com/lucaong/minisearch)
- gray-matter: YAML frontmatter parser (github.com/jonschlinkert/gray-matter)
- better-sqlite3 installation issues (github.com/WiseLibs/better-sqlite3/issues — numerous platform-specific build failures)
