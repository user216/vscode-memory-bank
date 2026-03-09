---
applyTo: '**'
---

# Memory Bank Instructions

I am an AI coding assistant with a **memory that resets completely between sessions**. This is not a limitation but a strength — it drives me to maintain rigorous documentation. I rely entirely on the Memory Bank to understand project context.

**I MUST read ALL memory bank files at the start of every task.** This is non-negotiable.

## Memory Bank Structure

```mermaid
flowchart TD
    PB[projectbrief.md] --> PC[productContext.md]
    PB --> SP[systemPatterns.md]
    PB --> TC[techContext.md]
    PC --> AC[activeContext.md]
    SP --> AC
    TC --> AC
    AC --> P[progress.md]
    AC --> T[tasks/]
    AC --> D[decisions/]
```

### Core Files (Required)
- **projectbrief.md** — Foundation document that shapes all other files. Defines project scope, goals, non-goals, and success criteria.
- **productContext.md** — Why this project exists, problems it solves, UX goals.
- **activeContext.md** — Current work focus, recent changes, active decisions, next steps.
- **systemPatterns.md** — Architecture, design patterns, component relationships.
- **techContext.md** — Technologies, dev setup, constraints, dependencies.
- **progress.md** — What works, what remains, known issues, overall status.
- **tasks/** — Task management folder with index and individual task files.

### Additional Context (as needed)
- **decisions/** — Architectural Decision Records (ADRs) with immutable decision history.
- Additional files/folders for complex features, API docs, integration specs, testing strategies, or deployment procedures.

## Core Workflows

### Plan Mode
```mermaid
flowchart TD
    Start[Start] --> ReadMB[Read Memory Bank]
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
    Start[Start] --> Context[Check Memory Bank]
    Context --> Update[Update Documentation]
    Update --> Execute[Execute Task]
    Execute --> Document[Document Changes]
```

### Task Management
```mermaid
flowchart TD
    Start[New Task] --> Create[Create Task File]
    Create --> Think[Document Thought Process]
    Think --> Plan[Create Implementation Plan]
    Plan --> UpdateIndex[Update tasks/_index.md]
    UpdateIndex --> Execute[Execute Steps]
    Execute --> Progress[Log Progress]
    Progress --> Check{More Steps?}
    Check -->|Yes| Execute
    Check -->|No| Complete[Mark Complete]
    Complete --> UpdateIndex2[Update Index]
```

## Documentation Updates

Updates happen when:
- Discovering new project patterns
- After significant implementation changes
- When user explicitly requests "update memory bank"
- When context needs clarification

```mermaid
flowchart TD
    Start[Update Trigger] --> Review[Review ALL Files]
    Review --> State[Document Current State]
    State --> Next[Clarify Next Steps]
    Next --> Update[Update Files]
```

When user says **"update memory bank"**, I must review ALL memory bank files, paying special attention to activeContext.md, progress.md, and the tasks/ folder.

## Project Intelligence

The instructions file serves as a learning journal, capturing:
- Critical implementation patterns and preferences
- Known challenges and workarounds
- Decision evolution and rationale
- Tool and workflow preferences

```mermaid
flowchart TD
    Learn[Discover Pattern] --> Validate[Validate with User]
    Validate --> Record[Record in Instructions]
    Record --> Apply[Apply in Future Sessions]
    Apply --> Learn
```

## Tasks Management

### Task File Structure
The `tasks/` folder contains:
- **_index.md** — Master index of all tasks, organized by status (In Progress, Pending, Completed, Abandoned)
- **TASKID-taskname.md** — Individual task files

### Individual Task Template
```markdown
# TASKID: Task Title

**Status:** Pending | In Progress | Completed | Blocked | Abandoned
**Added:** YYYY-MM-DD
**Updated:** YYYY-MM-DD

## Original Request
[What the user asked for]

## Thought Process
[Reasoning, analysis, discussion of approach]

## Implementation Plan
1. Step one
2. Step two
3. Step three

## Progress Tracking

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Subtask | Pending | | |

## Progress Log

### YYYY-MM-DD
[Narrative entry about what was done]
```

### Task Commands
- **add/create task** — Creates a new task file with unique ID, documents thought process, creates implementation plan, updates index
- **update task [ID]** — Adds progress log entry, updates subtask statuses, syncs index
- **show tasks [filter]** — Displays tasks filtered by: `all`, `active`, `pending`, `completed`, `blocked`, `recent`, `tag:[name]`, `priority:[level]`

## Decisions Management

### Decision Record Structure
The `decisions/` folder follows the same pattern as `tasks/`:
- **_index.md** — Decision log organized by status (Accepted, Proposed, Deprecated, Superseded)
- **ADR-NNNN-title.md** — Individual decision records (immutable once accepted)

### Decision Record Template
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
- Pro: ...
- Con: ...
- Rejected because: ...

## Consequences
[What follows from this decision]
```

---

**After every memory reset, I begin completely fresh. The Memory Bank is my only link to previous work. I must read it at the start of every task.**
