# vscode-memory-bank MCP Server

MCP server for structured AI memory — full-text search, token-budgeted recall, knowledge graph, and task/decision management backed by SQLite with FTS5.

## Setup

```bash
cd mcp
npm install
npm run build
```

The server runs on stdio and is configured via `.mcp.json` or VS Code MCP settings:

```json
{
  "mcpServers": {
    "mbvmb-mcp": {
      "command": "node",
      "args": ["<path>/mcp/build/index.js"],
      "env": {
        "MEMORY_BANK_PATH": "<path>/memory-bank"
      }
    }
  }
}
```

## Architecture

- **Source of truth:** Markdown files in `memory-bank/` (tasks, decisions, core context files)
- **Secondary index:** SQLite database with FTS5 for search and graph queries
- **Sync:** Files are synced to SQLite on startup and watched for changes

## Tools (11)

### Search & Query

#### `memory_search`

Full-text search across all memory bank content using FTS5.

```json
{
  "query": "authentication AND oauth",
  "type": "decision",
  "limit": 5
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | FTS5 query (supports `AND`, `OR`, `NOT`, `prefix*`) |
| `type` | `"core"` \| `"task"` \| `"decision"` | No | — | Filter by item type |
| `limit` | number | No | 10 | Max results (1–50) |

Returns matched items with highlighted excerpts using `>>>` / `<<<` markers.

---

#### `memory_query`

Structured query by type, status, or date range.

```json
{
  "type": "task",
  "status": "In Progress",
  "since": "2026-03-01",
  "limit": 10
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | `"core"` \| `"task"` \| `"decision"` | No | — | Filter by item type |
| `status` | string | No | — | Filter by status (e.g. `"Completed"`, `"Accepted"`) |
| `since` | string | No | — | Items updated on or after this date (YYYY-MM-DD) |
| `until` | string | No | — | Items updated on or before this date (YYYY-MM-DD) |
| `limit` | number | No | 20 | Max results (1–100) |

All filters combine with AND logic. Results ordered by most recently updated.

---

#### `memory_recall`

Token-budgeted context retrieval. Returns prioritized content that fits within a token budget — ideal for loading context at session start.

```json
{
  "budget": 4000,
  "priority": "active"
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `budget` | number | No | 8000 | Token budget (500–100,000) |
| `priority` | `"foundational"` \| `"recent"` \| `"active"` | No | `"active"` | Priority strategy |

**Strategies:**
- `foundational` — Project overview first (projectbrief, productContext, etc.)
- `recent` — Most recently updated items first
- `active` — Current context + in-progress tasks + proposed decisions first

---

### Knowledge Graph

#### `memory_link`

Create a typed relationship between two items.

```json
{
  "source": "TASK-001",
  "target": "ADR-0003",
  "relation": "implements"
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source` | string | Yes | — | Source item ID (e.g. `"TASK-001"`, `"ADR-0001"`) |
| `target` | string | Yes | — | Target item ID |
| `relation` | string | Yes | — | Relationship type (e.g. `"implements"`, `"supersedes"`, `"blocks"`, `"depends-on"`, `"references"`) |

Validates both items exist. Handles duplicates gracefully.

---

#### `memory_graph`

Traverse the knowledge graph from a starting item.

```json
{
  "item": "ADR-0001",
  "depth": 2,
  "direction": "both"
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `item` | string | Yes | — | Starting item ID |
| `depth` | number | No | 1 | Traversal depth (1–5) |
| `direction` | `"outgoing"` \| `"incoming"` \| `"both"` | No | `"both"` | Traversal direction |

Returns a list of nodes and edges. Uses BFS traversal with deduplication.

---

### Discovery

#### `memory_schema`

Returns the memory bank data model — item types, status values, link relations, and all available tools.

```json
{}
```

No parameters. Returns a JSON object with live counts and schema info.

---

### Task Management

#### `memory_create_task`

Create a new task with auto-generated ID and proper formatting.

```json
{
  "title": "Implement user authentication",
  "request": "Add OAuth2 login flow with Google and GitHub providers",
  "plan": ["Research OAuth2 libraries", "Implement auth endpoints", "Add session management"],
  "subtasks": ["Google provider", "GitHub provider", "Session storage"]
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | — | Task title |
| `request` | string | Yes | — | Description of what needs to be done |
| `plan` | string[] | No | — | Implementation plan steps |
| `subtasks` | string[] | No | — | Subtask descriptions for progress tracking |

**Side effects:** Creates `TASK-NNN-<slug>.md` in `memory-bank/tasks/`, updates `_index.md`, syncs to SQLite.

---

### Decision Management (ADRs)

#### `memory_create_decision`

Create a new ADR decision with auto-generated ID and proper formatting.

```json
{
  "title": "Use PostgreSQL for persistence",
  "context": "We need a relational database for the user management service.",
  "decision": "Use PostgreSQL 16 with pgvector extension for embeddings.",
  "status": "Proposed",
  "deciders": "team-lead",
  "alternatives": [
    { "name": "MongoDB", "description": "NoSQL option. Rejected due to relational query needs." },
    { "name": "SQLite", "description": "Lightweight but lacks concurrent write support at scale." }
  ],
  "consequences": [
    "Need PostgreSQL hosting (managed or self-hosted)",
    "Can leverage pgvector for future AI features"
  ]
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | — | Decision title |
| `context` | string | Yes | — | Problem or situation prompting this decision |
| `decision` | string | Yes | — | What was decided |
| `status` | `"Proposed"` \| `"Accepted"` \| `"Deprecated"` \| `"Superseded"` | No | `"Proposed"` | Initial status |
| `deciders` | string | No | `""` | Who made or proposed this decision |
| `alternatives` | `{name, description}[]` | No | — | Alternatives considered |
| `consequences` | string[] | No | — | List of consequences |

**Side effects:** Creates `ADR-NNNN-<slug>.md` in `memory-bank/decisions/`, updates `_index.md`, syncs to SQLite.

---

#### `memory_import_decisions`

Import external ADR files or re-sync existing decisions to SQLite.

**Re-sync mode** (no parameters — re-reads existing decisions):
```json
{}
```

**Import mode** (import from external directory):
```json
{
  "source_directory": "/path/to/existing/adrs",
  "preserve_content": true
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source_directory` | string | No | — | Directory to import `.md` files from. Omit to re-sync existing decisions. |
| `preserve_content` | boolean | No | `true` | If true, keeps original content (prepends ADR header if missing). If false, restructures into standard ADR template. |

**Import mode:** Assigns new `ADR-NNNN` IDs, copies files to `decisions/`, syncs to SQLite.
**Re-sync mode:** Reads existing `ADR-*.md` files and re-syncs all to SQLite.

---

### Status Updates

#### `memory_update_status`

Update the status of a task or decision.

```json
{
  "id": "TASK-001",
  "status": "Completed",
  "log_entry": "All tests passing, feature deployed."
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | string | Yes | — | Item ID (e.g. `"TASK-001"`, `"ADR-0001"`) |
| `status` | string | Yes | — | New status |
| `log_entry` | string | No | — | Progress log entry to append |

**Valid statuses:**
- Tasks: `Pending`, `In Progress`, `Completed`, `Abandoned`
- Decisions: `Proposed`, `Accepted`, `Deprecated`, `Superseded`

**Side effects:** Updates `**Status:**` and `**Updated:**` in the `.md` file, appends log entry to `## Progress Log`, updates `_index.md`, syncs to SQLite.

---

#### `memory_save_context`

Save the current active context to `activeContext.md`.

```json
{
  "current_focus": "Implementing FTS5 search for memory bank",
  "recent_changes": [
    "Added memory_search tool with FTS5",
    "Fixed SQLite WAL mode initialization"
  ],
  "current_decisions": ["Use better-sqlite3 for FTS5 support"],
  "next_steps": ["Add test coverage", "Write documentation"]
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `current_focus` | string | Yes | — | One-line summary of current focus |
| `recent_changes` | string[] | Yes | — | List of recent changes |
| `current_decisions` | string[] | No | — | Active decisions (preserved from file if omitted) |
| `next_steps` | string[] | No | — | Next steps |

**Side effects:** Overwrites `memory-bank/activeContext.md`, syncs to SQLite.

## Data Model

| Type | ID Format | Statuses | Storage |
|------|-----------|----------|---------|
| `core` | filename stem (e.g. `projectbrief`) | — | `memory-bank/*.md` |
| `task` | `TASK-NNN` (3-digit) | Pending → In Progress → Completed / Abandoned | `memory-bank/tasks/` |
| `decision` | `ADR-NNNN` (4-digit) | Proposed → Accepted → Deprecated / Superseded | `memory-bank/decisions/` |

Cross-references (`TASK-NNN`, `ADR-NNNN`) in markdown content are auto-detected and stored as `references` links in the knowledge graph.
