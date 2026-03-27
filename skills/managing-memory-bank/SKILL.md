---
name: managing-memory-bank
description: >-
  Maintain AI project memory across sessions via structured documentation.
  Use when initializing Memory Bank for new/existing projects, updating
  memory bank docs (projectbrief, activeContext, progress, tasks, decisions),
  managing task files, creating ADRs, or reviewing context before starting work.
  Also use when the user says "update memory bank".
argument-hint: describe what you want to do with the memory bank
user-invocable: true
disable-model-invocation: false
---

# Managing Memory Bank Skill

You are managing a Memory Bank — a structured set of markdown files that persist project context across AI coding sessions.

## When This Skill Activates
- User mentions "memory bank", "update memory bank", "memory", "context"
- Starting a new session (need to read context)
- Before/after significant code changes (need to document)
- User creates, updates, or queries tasks
- User makes architectural decisions that should be recorded

## Memory Bank Layouts

The memory bank supports two directory layouts:

### v2 Layout (flat — recommended for new projects)
```
memory-bank/
├── projectbrief.md        ← project overview
├── activeContext.md        ← current focus, recent changes
├── progress.md             ← what works, what remains
├── TASK-001.md             ← task files (flat)
├── ADR-0001.md             ← decision files (flat)
├── NOTE-001.md             ← knowledge notes
└── .mcp/                   ← tooling artifacts (gitignored)
```

### v1 Layout (subdirectories — backward compatible)
```
memory-bank/
├── projectbrief.md
├── productContext.md
├── systemPatterns.md
├── techContext.md
├── activeContext.md
├── progress.md
├── tasks/
│   ├── _index.md
│   └── TASK-001-title.md
└── decisions/
    ├── _index.md
    └── ADR-0001-title.md
```

Both layouts are fully supported by the MCP server and VS Code extension.

## Core Operations

### Initialize Memory Bank
When a project has no `memory-bank/` folder:
1. Create `memory-bank/` directory
2. Create core files: `projectbrief.md`, `activeContext.md`, `progress.md`
3. Ask user for project brief information
4. Populate projectbrief.md from user input
5. Optionally create `productContext.md`, `systemPatterns.md`, `techContext.md` from codebase analysis
6. Set activeContext.md and progress.md to initial state

Use templates from: [projectbrief template](./templates/projectbrief.md), [task template](./templates/task-template.md), [decision template](./templates/decision-template.md)

### Read Context (Session Start)
**If Memory Bank MCP tools are available** (preferred):
1. Call `memory_recall` with `priority: "active"` to load token-budgeted context
2. Call `memory_query` with `type: "task"` and `status: "In Progress"` to see active tasks
3. Call `memory_schema` to understand current item counts and relationships
4. Summarize current state to user
5. Ask if context is still accurate

**If MCP tools are not available** (fallback):
1. Read ALL memory bank files in order:
   - projectbrief.md (foundations)
   - productContext.md (purpose) — if exists
   - systemPatterns.md (architecture) — if exists
   - techContext.md (tech stack) — if exists
   - activeContext.md (current state)
   - progress.md (what's done/remaining)
   - tasks/_index.md or TASK-*.md files
   - decisions/_index.md or ADR-*.md files
2. Summarize current state to user
3. Ask if context is still accurate

### Update Memory Bank
When triggered by user saying "update memory bank" or after significant changes:
1. Use `memory_recall` (if MCP available) or read ALL files to review current state
2. Update activeContext.md via `memory_save_context` or direct edit
3. Update progress.md with current status
4. Update task statuses via `memory_update_status`
5. Record any decisions via `memory_create_decision`
6. Use `memory_link` (if MCP available) to connect related items (tasks to ADRs, etc.)

### Manage Tasks
**With MCP tools** (preferred):
- **Create**: `memory_create_task` (auto-generates ID, formats file, updates index)
- **Update**: `memory_update_status` to change status, add progress log entries
- **Query**: `memory_query` with `type: "task"` and optional `status` filter
- **Link**: `memory_link` to connect tasks to related ADRs or other items
- **Dashboard**: `memory_status` for computed task/decision aggregates

**Without MCP** (fallback):
- **Create**: Create file manually using task template (v1 or v2 format)
- **Update**: Edit status and progress log directly in file
- **Query**: Read `_index.md` or scan `TASK-*.md` files

### Record Decisions
When an architectural or design decision is made:
1. Create ADR via `memory_create_decision` (or manually using template)
2. Document context, decision, alternatives considered, consequences
3. Use `memory_link` to connect ADR to implementing tasks (if MCP available)
4. ADRs are immutable once accepted — to change, create a new ADR that supersedes

### Create Knowledge Notes (v2)
For atomic knowledge capture:
1. Use `memory_create_note` to create `NOTE-NNN.md` with YAML frontmatter
2. Add tags for categorization
3. Use wikilinks `[[ID]]` to reference related items
4. Link to ADRs and tasks via `memory_link`

### Search and Explore
- **Full-text search**: `memory_search` — MiniSearch with BM25 ranking, prefix/fuzzy matching
- **Structured query**: `memory_query` — filter by type, status, date range
- **Tag browsing**: `memory_tags` — list all tags or filter items by tag
- **Graph traversal**: `memory_graph` — explore connections between items
- **Token-budgeted recall**: `memory_recall` — load context within a token budget

## File Metadata Formats

### v2 format (YAML frontmatter — recommended)
```markdown
---
type: task
status: In Progress
tags: [backend, auth]
related: [ADR-0003, TASK-012]
created: 2026-03-15
updated: 2026-03-27
---
# TASK-014: Implement OAuth2 login flow
```

### v1 format (bold metadata — still supported)
```markdown
# TASK-014: Implement OAuth2 login flow

**Status:** In Progress
**Added:** 2026-03-15
**Updated:** 2026-03-27
```

## MCP Tools Reference

| Operation | MCP Tool | Description |
|-----------|----------|-------------|
| Load context | `memory_recall` | Token-budgeted context retrieval |
| Full-text search | `memory_search` | MiniSearch with BM25, prefix, fuzzy |
| Structured query | `memory_query` | Filter by type, status, date |
| Create task | `memory_create_task` | Auto-ID, formatted file |
| Create decision | `memory_create_decision` | Auto-ID, ADR format |
| Create note | `memory_create_note` | Auto-ID, YAML frontmatter |
| Update status | `memory_update_status` | Validated status changes |
| Update decision | `memory_update_decision` | Modify ADR content |
| Save context | `memory_save_context` | Structured activeContext update |
| Link items | `memory_link` | Typed directional relationships |
| Unlink items | `memory_unlink` | Remove relationships |
| Update link | `memory_update_link` | Change relation type |
| Graph traversal | `memory_graph` | BFS from any item |
| Schema info | `memory_schema` | Data model and counts |
| Dashboard | `memory_status` | Computed aggregates |
| Browse tags | `memory_tags` | Tag cloud and filtering |
| Import ADRs | `memory_import_decisions` | Bulk import from directory |

## Important Rules
- ALWAYS use Memory Bank MCP tools when available — they are more efficient than raw file reads
- MCP write tools (`memory_create_*`, `memory_update_*`, `memory_save_context`) write to the markdown files AND update the in-memory index
- ALWAYS read memory bank (via MCP or files) before starting work
- ALWAYS update memory bank after significant changes
- ADRs are append-only (never edit accepted ADRs, only supersede)
- Both v1 and v2 metadata formats are supported — use v2 YAML frontmatter for new files
