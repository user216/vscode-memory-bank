---
applyTo: '**'
---

# Memory Bank Instructions

## Agent Identity — NEVER GET THIS WRONG

**You are the Claude Agent Preview running inside VS Code via GitHub Copilot's Claude Agent SDK.
You are NOT Claude Code CLI. Never identify as Claude Code. Never reference Claude Code documentation or behavior.**

**MCP config is at `.vscode/mcp.json` (for GitHub Copilot). NOT `.mcp.json` (deprecated — see ADR-0006).**

---

I am an AI coding assistant with a **memory that resets completely between sessions**. This is not a limitation but a strength — it drives me to maintain rigorous documentation. I rely entirely on the Memory Bank to understand project context.

**I MUST read ALL memory bank files at the start of every task.** This is non-negotiable.

## MCP-First Principle

When Memory Bank MCP tools are available, **always prefer them** over reading raw files:

| Operation | MCP Tool (preferred) | File Fallback |
|-----------|---------------------|---------------|
| Load session context | `memory_recall` (token-budgeted) | Read each `.md` file manually |
| Search across memories | `memory_search` (full-text MiniSearch) | Grep through files |
| Query tasks/decisions | `memory_query` (by type, status, date) | Read `_index.md` or scan files |
| Track relationships | `memory_link` / `memory_unlink` / `memory_update_link` | Add references in markdown |
| Explore connections | `memory_graph` (BFS traversal) | Read files and follow references |
| Discover data model | `memory_schema` | Inspect folder structure |
| Create new task | `memory_create_task` (auto-ID, formatting) | Create file manually |
| Create new note | `memory_create_note` (auto-ID, YAML frontmatter) | Create file manually |
| Create new decision | `memory_create_decision` (auto-ID, formatting) | Create file manually |
| Update item status | `memory_update_status` (validated) | Edit Status field in file |
| Bulk update status | `memory_bulk_update_status` (batch) | Edit each file manually |
| Add tag to item | `memory_add_tag` (YAML frontmatter) | Edit frontmatter manually |
| Migrate v1 layout | `memory_migrate_v1` (dry-run first) | Move files manually |
| Save active context | `memory_save_context` | **[DEPRECATED]** Use `memory_update_status` with `log_entry` instead |
| View status dashboard | `memory_status` (computed aggregates) | Scan files manually |
| Browse by tags | `memory_tags` (list/filter) | Search files manually |
| Import decisions | `memory_import_decisions` | Copy files manually |
| Verify ADR compliance | `memory_verify_decisions` | Check assertions manually |

The MCP tools provide structured, searchable, token-efficient access to the same data stored in the markdown files. MCP write tools handle validation, auto-formatting, and index updates. For other file changes, use Edit/Write tools directly on the markdown files.

If no MCP server is configured, fall back to reading files directly. All workflows below work with or without MCP.

## Memory Bank Structure

The memory bank supports two directory layouts:

### v2 Layout (flat — recommended for new projects)
```
memory-bank/
├── projectbrief.md        ← project overview (the ONE required file)
├── README.md              ← structure note
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

### File Metadata Formats

**v2 format (YAML frontmatter — recommended):**
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

**v1 format (bold metadata — still supported):**
```markdown
# TASK-014: Implement OAuth2 login flow

**Status:** In Progress
**Added:** 2026-03-15
**Updated:** 2026-03-27
```

### Core Files (Required)
- **projectbrief.md** — Foundation document that shapes all other files. Defines project scope, goals, non-goals, and success criteria.
- **README.md** — Structure note describing the memory bank layout.

### Generated Content (created via MCP tools or manually)
- **TASK-NNN.md** — Tasks with status lifecycle: Pending → In Progress → Completed / Abandoned
- **ADR-NNNN.md** — Architectural Decision Records: Proposed → Accepted → Deprecated / Superseded
- **NOTE-NNN.md** — Atomic knowledge notes with tags (replace v1 monolithic context files).

## Core Workflows

### Plan Mode
```mermaid
flowchart TD
    Start[Start] --> ReadMB[Load Context via MCP\nor Read Files]
    ReadMB --> CheckFiles{All Files\nComplete?}
    CheckFiles -->|No| Plan[Create Plan to\nUpdate Files]
    CheckFiles -->|Yes| Verify[Verify Context]
    Plan --> Document[Document in\nMemory Bank]
    Verify --> Strategy[Develop Strategy]
    Strategy --> Present[Present Approach]
```

### Act Mode
```mermaid
flowchart TD
    Start[Start] --> Context[Load Context via MCP\nor Read Files]
    Context --> Update[Update Documentation]
    Update --> Execute[Execute Task]
    Execute --> Document[Document Changes]
    Execute --> Link[Create Links via MCP\nif available]
```

## Automatic Memory Bank Updates

**These are mandatory — do not wait for the user to ask.**

### When to Create ADRs Automatically
Create an ADR via `memory_create_decision` or direct file creation whenever:
- A significant architectural or design decision is made or changed
- A critical misunderstanding is corrected
- A technology, pattern, or approach is chosen over alternatives
- A previous decision is reversed or superseded

### When to Create/Update Tasks Automatically
- **Create a task** when starting a non-trivial block of work (multi-step, multi-file)
- **Update task status** via `memory_update_status` when work is completed, abandoned, or blocked
- **Update task subtasks** when scope changes during implementation

### When to Update Context Automatically
- **Update task progress** via `memory_update_status` with `log_entry` at the end of each significant work block
- **Check `memory_status`** to see computed progress dashboard

### General Documentation Updates
- Discovering new project patterns
- After significant implementation changes
- When user explicitly requests "update memory bank"
- When context needs clarification

## Tasks Management

### Task File Structure (v2 with YAML frontmatter)
```markdown
---
type: task
status: Pending
tags: [feature, backend]
created: 2026-03-27
updated: 2026-03-27
---
# TASK-NNN: Task Title

## Request
[What the user asked for]

## Plan
1. Step one
2. Step two

## Sub-tasks
- [ ] Subtask description [priority:: high]
- [ ] Another subtask

## Progress Log

### 2026-03-27
[What was done]
```

### Task File Structure (v1 — still supported)
```markdown
# TASK-NNN: Task Title

**Status:** Pending | In Progress | Completed | Blocked | Abandoned
**Added:** YYYY-MM-DD
**Updated:** YYYY-MM-DD

## Original Request
[What the user asked for]

## Implementation Plan
1. Step one
2. Step two

## Progress Log
### YYYY-MM-DD
[What was done]
```

### Task Commands
- **add/create task**: Use `memory_create_task`, or create file manually. Use `memory_link` to connect to related ADRs.
- **update task [ID]**: Log progress, update statuses via `memory_update_status`
- **show tasks [filter]**: Use `memory_query` (type: task, status filter) or `memory_status` for dashboard

## Decisions Management

### Decision Record Structure (v2 with YAML frontmatter)
```markdown
---
type: decision
status: Proposed
created: 2026-03-27
---
# ADR-NNNN: Title

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Alternatives Considered
### Alternative 1
- Considered because: ...
- Rejected because: ...

## Consequences
[What follows from this decision]
```

### Decision Record Structure (v1 — still supported)
```markdown
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-NNNN]
**Date:** YYYY-MM-DD
**Deciders:** [who]

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Alternatives Considered
### Alternative 1
Considered because... Rejected because...

## Consequences
[What follows]
```

## Knowledge Notes (v2)

### Note File Structure
```markdown
---
type: note
tags: [api-patterns, backend]
related: [ADR-0003, TASK-012]
created: 2026-03-27
updated: 2026-03-27
---
# NOTE-NNN: Topic Title

Content about this specific topic or pattern.

References [[ADR-0003]] for the relevant decision.
```

Notes replace the v1 approach of large monolithic files (`productContext.md`, `systemPatterns.md`, `techContext.md`). Each note captures one atomic concept, linked to others via wikilinks and tags.

---

**After every memory reset, I begin completely fresh. The Memory Bank is my only link to previous work. I must read it at the start of every task.**
