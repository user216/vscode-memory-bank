# Memory Bank for VS Code — User Guide

**Version 0.2.1** | **Apache License 2.0** | **[GitHub Repository](https://github.com/user216/vscode-memory-bank)**

A 7-layer toolkit that gives AI coding sessions persistent project context that survives across sessions, context compaction, and model switches. Built for VS Code + GitHub Copilot + Claude Agent SDK.

---

## Table of Contents

1. [What Is Memory Bank?](#1-what-is-memory-bank)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
   - [Quick Start (Layer 0 only)](#31-quick-start-layer-0-only)
   - [Recommended Setup (Layers 0–2)](#32-recommended-setup-layers-02)
   - [Full Setup (All Layers)](#33-full-setup-all-layers)
4. [Architecture Overview](#4-architecture-overview)
5. [Core Concepts](#5-core-concepts)
   - [Memory Bank Files](#51-memory-bank-files)
   - [Tasks](#52-tasks)
   - [Decisions (ADRs)](#53-decisions-adrs)
   - [Knowledge Graph](#54-knowledge-graph)
6. [Layer 0 — Custom Instructions](#6-layer-0--custom-instructions)
7. [Layer 1 — Agent Skill](#7-layer-1--agent-skill)
8. [Layer 2 — Prompt Files (Slash Commands)](#8-layer-2--prompt-files-slash-commands)
9. [Layer 3 — Custom Agents](#9-layer-3--custom-agents)
10. [Layer 4 — Hooks](#10-layer-4--hooks)
11. [Layer 5 — MCP Server](#11-layer-5--mcp-server)
    - [Setup](#111-setup)
    - [Tools Reference](#112-tools-reference)
12. [Layer 6 — VS Code Extension](#12-layer-6--vs-code-extension)
    - [Sidebar Views](#121-sidebar-views)
    - [Status Bar](#122-status-bar)
    - [Knowledge Graph Webview](#123-knowledge-graph-webview)
    - [Commands](#124-commands)
    - [Configuration](#125-configuration)
    - [Automatic Git Integration](#126-automatic-git-integration)
13. [Workflows](#13-workflows)
    - [Starting a Session](#131-starting-a-session)
    - [During a Session](#132-during-a-session)
    - [Ending a Session](#133-ending-a-session)
    - [Task Management](#134-task-management)
    - [Recording Decisions](#135-recording-decisions)
14. [File Reference](#14-file-reference)
15. [Configuration Reference](#15-configuration-reference)
16. [Troubleshooting](#16-troubleshooting)
17. [FAQ](#17-faq)

---

## 1. What Is Memory Bank?

AI coding assistants start every session from zero. They don't remember what you worked on yesterday, what decisions you made, or what the current state of the project is. Memory Bank solves this by storing project context in structured markdown files that the AI reads at session start and updates as work progresses.

**Key features:**
- **Persistent context** — project brief, architecture, tech stack, current focus, progress, tasks, and decisions survive across sessions
- **Structured search** — full-text search with FTS5, structured queries by type/status/date, token-budgeted context retrieval
- **Knowledge graph** — typed relationships between items (tasks implement decisions, decisions supersede previous ones)
- **Progressive enhancement** — start with a single instruction file, add capabilities as needed
- **Human-readable** — all state stored as markdown files in your repository, editable by hand
- **Git-friendly** — memory bank files are tracked in git, including the SQLite database

---

## 2. Requirements

| Requirement | Layer | Notes |
|-------------|-------|-------|
| VS Code 1.95+ | All | 1.106+ recommended for skill support |
| GitHub Copilot extension | All | With Claude Agent SDK enabled |
| Claude model | All | Claude Opus recommended; agents inherit your Copilot default |
| Node.js 20+ | Layer 5 (MCP) | For building and running the MCP server |
| `jq` | Layer 4 (Hooks) | Optional — hooks work without it but use less efficient parsing |
| Git | Layer 6 (Extension) | For the auto-commit git hook |
| `sqlite3` CLI | Optional | For WAL checkpointing in git hooks; system binary usually includes FTS5 |

---

## 3. Installation

### 3.1 Quick Start (Layer 0 only)

The simplest setup — just copy one instruction file:

```bash
mkdir -p .github/instructions
cp path/to/vscode-memory-bank/instructions/memory-bank.instructions.md .github/instructions/
```

Then tell your AI: **"initialize memory bank"**. It will create the `memory-bank/` folder with all core files.

This gives you:
- 7 core context files managed by markdown read/write
- Task and decision management via file operations
- Session workflows (Plan mode, Act mode)

### 3.2 Recommended Setup (Layers 0–2)

Adds slash commands for common operations:

```bash
# Layer 0 — Instructions
mkdir -p .github/instructions
cp path/to/vscode-memory-bank/instructions/memory-bank.instructions.md .github/instructions/

# Layer 2 — Prompt files
mkdir -p .github/prompts
cp path/to/vscode-memory-bank/prompts/*.prompt.md .github/prompts/
```

This adds four slash commands: `/memory-init`, `/memory-update`, `/memory-review`, `/memory-task`.

### 3.3 Full Setup (All Layers)

```bash
# Layer 0 — Instructions
mkdir -p .github/instructions
cp path/to/vscode-memory-bank/instructions/memory-bank.instructions.md .github/instructions/

# Layer 1 — Agent Skill
mkdir -p .github/copilot/skills
cp -r path/to/vscode-memory-bank/skills/managing-memory-bank .github/copilot/skills/

# Layer 2 — Prompt files
mkdir -p .github/prompts
cp path/to/vscode-memory-bank/prompts/*.prompt.md .github/prompts/

# Layer 3 — Custom Agents
mkdir -p .github/copilot/agents
cp path/to/vscode-memory-bank/agents/*.agent.md .github/copilot/agents/

# Layer 4 — Hooks
cp path/to/vscode-memory-bank/hooks/memory-hooks.json .vscode/memory-hooks.json
cp -r path/to/vscode-memory-bank/hooks/scripts .vscode/hooks-scripts
# Update script paths in memory-hooks.json to match the new location

# Layer 5 — MCP Server
cd path/to/vscode-memory-bank/mcp && npm install && npx tsc
# Then configure .mcp.json (see Section 11.1)

# Layer 6 — VS Code Extension
cd path/to/vscode-memory-bank/extension && npm install && npm run build
# Load as development extension or package as .vsix
```

> **Important:** After copying hooks, update the script paths in `.vscode/memory-hooks.json` to point to `.vscode/hooks-scripts/` instead of `./hooks/scripts/`.

---

## 4. Architecture Overview

Memory Bank uses 7 layers of progressive enhancement. Each layer is optional and works without the layers above it:

```
┌─────────────────────────────────────────────────┐
│  Layer 6: VS Code Extension                     │
│  Sidebar, status bar, knowledge graph webview    │
├─────────────────────────────────────────────────┤
│  Layer 5: MCP Server                            │
│  SQLite + FTS5 search, token budgeting, graph   │
├─────────────────────────────────────────────────┤
│  Layer 4: Hooks                                 │
│  Session start/stop, context compaction capture  │
├─────────────────────────────────────────────────┤
│  Layer 3: Custom Agents                         │
│  Plan mode + Act mode personas with handoffs    │
├─────────────────────────────────────────────────┤
│  Layer 2: Prompt Files                          │
│  /memory-init, /memory-update, /memory-review   │
├─────────────────────────────────────────────────┤
│  Layer 1: Agent Skill                           │
│  Auto-detected capability bundle with templates │
├─────────────────────────────────────────────────┤
│  Layer 0: Custom Instructions                   │
│  Base conventions, workflows, file formats      │
└─────────────────────────────────────────────────┘
```

**Design principles:**
- **Additive compatibility** — every enhancement is additive; the original instruction's conventions remain unchanged
- **Progressive disclosure** — higher layers load only when needed, keeping context window usage minimal
- **Graceful degradation** — if MCP is down, the agent falls back to file-based read/write; if hooks aren't configured, the agent follows conventions manually
- **File-first storage** — all state is stored in markdown; SQLite is a secondary index

---

## 5. Core Concepts

### 5.1 Memory Bank Files

The memory bank stores context in a `memory-bank/` directory at your workspace root. Seven core files form a dependency hierarchy:

```
memory-bank/
├── projectbrief.md          ← Foundation — goals, scope, requirements
│   ├── productContext.md    ← Why the project exists, UX goals
│   ├── systemPatterns.md    ← Architecture, design patterns, conventions
│   └── techContext.md       ← Tech stack, dependencies, constraints
├── activeContext.md         ← Current focus, recent changes, next steps
├── progress.md              ← What works, what remains, known issues
├── tasks/                   ← Individual task files with progress logs
│   ├── _index.md            ← Master index grouped by status
│   └── TASK-NNN-*.md        ← Individual task files
├── decisions/               ← ADRs — immutable decision history
│   ├── _index.md            ← Decision log grouped by status
│   └── ADR-NNNN-*.md        ← Individual decision records
└── .mcp/                    ← MCP server data (auto-managed)
    └── memory-bank.db       ← SQLite database with FTS5 index
```

The agent reads all files at session start and updates them as work progresses. `projectbrief.md` is the foundation — all other files derive context from it.

### 5.2 Tasks

Tasks track work items with rich progress tracking:

```markdown
# TASK-001: Build MCP Server

**Status:** In Progress
**Added:** 2026-03-01
**Updated:** 2026-03-05

## Original Request
Build the MCP server with SQLite and FTS5 search.

## Implementation Plan
1. Set up TypeScript project with better-sqlite3
2. Define database schema
3. Implement 6 read tools
4. Add file watcher for live sync

## Progress Tracking
| # | Subtask | Status | Updated | Notes |
|---|---------|--------|---------|-------|
| 1 | Project setup | Done | 2026-03-01 | |
| 2 | Schema | Done | 2026-03-02 | |
| 3 | Read tools | In Progress | 2026-03-05 | 4 of 6 complete |
| 4 | File watcher | Not Started | | |

## Progress Log
### 2026-03-05
Completed memory_search and memory_query tools. Started on memory_recall.
```

**Task statuses:** `Pending`, `In Progress`, `Completed`, `Abandoned`

**Task commands:**
- "add task" / "create task" — creates a new task file with auto-generated ID
- "update task TASK-001" — adds a progress log entry, updates subtask statuses
- "show tasks active" — lists tasks filtered by status

### 5.3 Decisions (ADRs)

Architectural Decision Records document significant design choices:

```markdown
# ADR-0001: Use SQLite for Persistence

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Team lead

## Context
Need a database for the MCP server that supports full-text search and runs embedded.

## Decision
Use SQLite with FTS5 via better-sqlite3. It bundles SQLite with FTS5 compiled in.

## Alternatives Considered
### PostgreSQL
Pro: Full-featured. Con: Requires external server. Rejected: overkill for embedded use.

## Consequences
- Simple deployment — single file, no server process
- FTS5 provides powerful full-text search
- WAL mode gives good concurrent read performance
```

**Decision statuses:** `Proposed`, `Accepted`, `Deprecated`, `Superseded`, `Rejected`

ADRs are append-only — once accepted, you don't edit them. Instead, create a new ADR that supersedes the old one.

### 5.4 Knowledge Graph

Items in the memory bank can be connected via typed, directional relationships:

```
TASK-001 ──[implements]──→ ADR-0001
ADR-0002 ──[supersedes]──→ ADR-0001
TASK-003 ──[depends-on]──→ TASK-001
activeContext ──[references]──→ TASK-001
```

**Common relation types:** `implements`, `supersedes`, `blocks`, `depends-on`, `references`

Cross-references (mentions of `TASK-NNN` or `ADR-NNNN` in markdown content) are automatically detected and linked with the `references` relation. Manual links with custom relations are created via the `memory_link` MCP tool.

---

## 6. Layer 0 — Custom Instructions

**File:** `instructions/memory-bank.instructions.md`

The foundation layer. This instruction file defines all conventions the AI agent follows:

- **File formats** — structure of each core file, tasks, and decisions
- **Workflows** — Plan mode (read, analyze, strategize), Act mode (execute, write code, update docs)
- **Automatic triggers** — when to create ADRs, update tasks, refresh active context
- **MCP-first principle** — when MCP tools are available, prefer them over raw file reads

**What it provides:**
- The AI remembers your project context across sessions
- Tasks and decisions are tracked systematically
- The AI updates documentation as work progresses

**What it does NOT provide:**
- Automatic context injection (you must tell the AI to read context)
- Structured search (the AI reads files sequentially)
- Token budgeting (the AI loads everything)

These gaps are filled by higher layers.

---

## 7. Layer 1 — Agent Skill

**File:** `skills/managing-memory-bank/SKILL.md`

The skill is an auto-detected capability bundle. When Copilot detects that your request relates to memory bank operations, it loads the skill automatically.

**Activation triggers** — user mentions "memory bank", "update memory bank", "update context", task operations, decision operations, or session context like "what was I working on."

**Five core operations:**
1. **Initialize** — create memory bank for new/existing projects
2. **Read Context** — load session context at start
3. **Update** — review and update all memory files
4. **Manage Tasks** — create, update, query tasks
5. **Record Decisions** — create ADRs and link to implementing tasks

**Templates included:**
- `templates/projectbrief.md` — template for new project briefs
- `templates/task-template.md` — template for new tasks
- `templates/decision-template.md` — template for new ADRs

**Installation:**
```bash
mkdir -p .github/copilot/skills
cp -r path/to/vscode-memory-bank/skills/managing-memory-bank .github/copilot/skills/
```

> Requires VS Code 1.106+ for skill support.

---

## 8. Layer 2 — Prompt Files (Slash Commands)

Four slash commands for common memory bank operations:

| Command | Purpose |
|---------|---------|
| `/memory-init` | Initialize a new memory bank or review an existing one |
| `/memory-update` | Review all files and update them to reflect current state |
| `/memory-review` | Read the entire memory bank and present a structured summary |
| `/memory-task` | Create, update, or query tasks |

### `/memory-init`

Creates the `memory-bank/` directory with all core files, or if one already exists, loads and reports its state. Analyzes your codebase to fill in the project brief.

### `/memory-update`

The most commonly used command. Walks through all memory bank files, compares documented state against actual codebase state, and updates everything that's out of date: active context, progress, task statuses, system patterns, and cross-reference links.

### `/memory-review`

Read-only — presents a structured summary of the entire project context:
- Project overview and architecture
- Tech stack and constraints
- Current focus and progress
- Active tasks and key decisions
- Knowledge graph connections
- Flags any inconsistencies

### `/memory-task`

Multi-purpose task command:
- "create a task for implementing OAuth" — creates a new task file
- "update TASK-001 with today's progress" — adds a progress log entry
- "show active tasks" — lists tasks filtered by status

**Installation:**
```bash
mkdir -p .github/prompts
cp path/to/vscode-memory-bank/prompts/*.prompt.md .github/prompts/
```

---

## 9. Layer 3 — Custom Agents

Two agent personas implementing the Plan/Act pattern:

### Memory Planner

**Role:** Plan mode — reads context, develops implementation strategy, creates task files. **Never edits source code or runs builds.**

**What it does at startup:**
1. Loads active context via MCP (or reads files)
2. Queries all tasks and decisions
3. Gets data model overview
4. Summarizes current state

**Handoff:** After planning, presents an "Execute Plan" button that hands off to Memory Worker.

### Memory Worker

**Role:** Act mode — executes plans, writes code, runs tests, and updates memory bank with progress. **The one that actually makes changes.**

**What it does at startup:**
1. Loads active context
2. Finds in-progress tasks
3. Searches for relevant context

**Handoff:** After executing, presents a "Review & Plan Next" button that hands off back to Memory Planner.

**Why two agents?**
- Prevents mode confusion (each agent has one job)
- Avoids context pollution (each starts fresh)
- Provides explicit checkpoints between planning and execution

**Installation:**
```bash
mkdir -p .github/copilot/agents
cp path/to/vscode-memory-bank/agents/*.agent.md .github/copilot/agents/
```

---

## 10. Layer 4 — Hooks

Three lifecycle hooks that automate context management:

### SessionStart

Fires when a new agent session begins. Reads `activeContext.md`, `progress.md`, and `tasks/_index.md` and injects their content into the conversation as additional context. The agent starts every session already knowing what you were working on.

### PreCompact

Fires before context compaction (when the context window fills up). Saves a timestamped snapshot of `activeContext.md` and tells the agent to re-read it after compaction, preserving continuity even when conversation history is trimmed.

### Stop (Session End)

Fires when the agent session is about to end. Checks if `activeContext.md` was updated in the last 5 minutes. If not, **blocks the stop** and asks the agent to save context first. Also checkpoints the SQLite WAL to ensure the database is ready for git commit.

### Enforce MCP Reads (Optional)

A `PreToolUse` hook (not enabled by default) that blocks direct `Read`/`Grep`/`Glob` on the `memory-bank/` folder, forcing the agent to use MCP tools instead. Enable it by adding the entry to `memory-hooks.json`.

**Installation:**
```bash
cp path/to/vscode-memory-bank/hooks/memory-hooks.json .vscode/memory-hooks.json
cp -r path/to/vscode-memory-bank/hooks/scripts .vscode/hooks-scripts
chmod +x .vscode/hooks-scripts/*.sh
```

After copying, update the `"command"` paths in `memory-hooks.json` to point to `.vscode/hooks-scripts/` instead of `./hooks/scripts/`.

> **Note:** Hooks work without `jq` installed — the scripts fall back to `grep`/`sed` parsing — but `jq` provides more reliable JSON handling.

---

## 11. Layer 5 — MCP Server

The MCP (Model Context Protocol) server provides structured access to memory bank data via SQLite with FTS5 full-text search.

### 11.1 Setup

**Build the server:**
```bash
cd path/to/vscode-memory-bank/mcp
npm install
npx tsc
```

**Configure in your project** — create `.mcp.json` at your workspace root:
```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "node",
      "args": ["/absolute/path/to/vscode-memory-bank/mcp/build/index.js"],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

> **Important:** The Claude Agent SDK reads MCP config from `.mcp.json` at the project root, NOT from `.vscode/mcp.json`.

**How it works:**
1. On startup, the server creates/opens an SQLite database at `memory-bank/.mcp/memory-bank.db`
2. It parses all `.md` files in `memory-bank/` and syncs them into the database
3. It starts a file watcher for live sync — changes to `.md` files are reflected immediately
4. 12 tools are registered and available to the AI agent

### 11.2 Tools Reference

#### Read Tools

##### `memory_search` — Full-text search

Search across all memory bank content using FTS5, with highlighted excerpt snippets.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | FTS5 query. Supports `AND`, `OR`, `NOT`, `prefix*`, `"exact phrase"`. Case-insensitive. |
| `type` | enum | No | — | Filter: `core`, `task`, `decision` |
| `limit` | number | No | 10 | Max results (1–50) |

**Examples:**
```
memory_search({ query: "authentication" })
memory_search({ query: "oauth AND google", type: "task" })
memory_search({ query: "deploy*", limit: 5 })
memory_search({ query: "NOT deprecated", type: "decision" })
```

##### `memory_query` — Structured query

Filter items by type, status, or date range. All filters combine with AND logic.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | enum | No | — | `core`, `task`, `decision` |
| `status` | string | No | — | Exact match (case-sensitive). Tasks: `Pending`, `In Progress`, `Completed`, `Abandoned`. Decisions: `Proposed`, `Accepted`, `Deprecated`, `Superseded`, `Rejected`. |
| `since` | string | No | — | ISO date `YYYY-MM-DD` — items updated on or after |
| `until` | string | No | — | ISO date `YYYY-MM-DD` — items updated on or before |
| `limit` | number | No | 20 | Max results (1–100) |

**Examples:**
```
memory_query({})                                         # List all items
memory_query({ type: "task", status: "In Progress" })    # Active tasks
memory_query({ since: "2026-03-01", type: "decision" })  # Recent decisions
```

##### `memory_recall` — Token-budgeted context retrieval

Load project context efficiently, prioritized by strategy and trimmed to fit a token budget. Call once at session start.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `budget` | number | No | 8000 | Token budget. ~4000 for quick orientation, ~8000 for working context, ~16000+ for deep review. (500–100,000) |
| `priority` | enum | No | `active` | `foundational`, `recent`, or `active` |

**Priority strategies:**

| Strategy | Order | Best for |
|----------|-------|----------|
| `foundational` | projectbrief → productContext → systemPatterns → techContext → activeContext → progress → tasks → decisions | New sessions, onboarding |
| `recent` | Most recently updated items first | Resuming after a break |
| `active` | activeContext → progress → in-progress tasks → proposed decisions → projectbrief → everything else | Continuing current work |

##### `memory_link` — Create relationships

Create typed, directional relationships between items.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | string | Yes | Source item ID (e.g., `TASK-001`) |
| `target` | string | Yes | Target item ID (e.g., `ADR-0001`). Both must exist. |
| `relation` | string | Yes | Relationship type: `implements`, `supersedes`, `blocks`, `depends-on`, `references`, or any custom string. |

**Examples:**
```
memory_link({ source: "TASK-001", target: "ADR-0001", relation: "implements" })
memory_link({ source: "ADR-0002", target: "ADR-0001", relation: "supersedes" })
```

##### `memory_graph` — Traverse knowledge graph

Explore connections from a starting item using BFS traversal.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `item` | string | Yes | — | Starting item ID |
| `depth` | number | No | 1 | Traversal depth (1–5) |
| `direction` | enum | No | `both` | `outgoing`, `incoming`, or `both` |

##### `memory_schema` — Data model overview

Returns item types, current counts, status values in use, link relation types, and all available tools. No parameters. Call this to discover what queries are possible.

#### Write Tools

##### `memory_create_task` — Create a new task

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | — | Short, descriptive title |
| `request` | string | Yes | — | Original request / description (multi-line) |
| `plan` | string[] | No | — | Implementation steps (numbered list) |
| `subtasks` | string[] | No | — | Subtask descriptions (progress tracking table) |

Auto-generates `TASK-NNN` ID, creates the markdown file, updates `tasks/_index.md`, syncs to SQLite.

##### `memory_create_decision` — Create a new ADR

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | — | Concise decision summary |
| `context` | string | Yes | — | Problem / forces prompting this decision (multi-line) |
| `decision` | string | Yes | — | What was decided and why (multi-line) |
| `status` | enum | No | `Proposed` | `Proposed`, `Accepted`, `Deprecated`, `Superseded`, `Rejected` |
| `deciders` | string | No | `""` | Who made or proposed this decision |
| `alternatives` | object[] | No | — | `[{ name, description }]` — alternatives considered |
| `consequences` | string[] | No | — | Positive and negative consequences |

Auto-generates `ADR-NNNN` ID, creates the markdown file, updates `decisions/_index.md`, syncs to SQLite.

##### `memory_import_decisions` — Import existing ADRs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source_directory` | string | No | — | Directory to import from. If omitted, re-syncs existing decisions to SQLite. |
| `preserve_content` | boolean | No | `true` | If true, keeps original content. If false, restructures into standard template. |

Imports files matching ADR naming patterns (`adr-*.md`, `NNNN-*.md`). Parses YAML frontmatter for title and status. Preserves original ADR numbers when possible.

##### `memory_update_status` — Update task/decision status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Item ID (e.g., `TASK-001`, `ADR-0001`) |
| `status` | string | Yes | New status (validated per item type) |
| `log_entry` | string | No | Progress log entry appended with today's date |

Updates the markdown, regenerates the index, syncs to SQLite.

##### `memory_update_decision` — Update ADR content

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ADR ID (e.g., `ADR-0001`) |
| `title` | string | No | New title (omit to keep) |
| `context` | string | No | New context section |
| `decision` | string | No | New decision section |
| `alternatives` | object[] | No | New alternatives (replaces section; `[]` to clear) |
| `consequences` | string[] | No | New consequences (replaces section; `[]` to clear) |

For status changes, use `memory_update_status` instead.

##### `memory_save_context` — Save active context

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `current_focus` | string | Yes | One-line summary of current project focus |
| `recent_changes` | string[] | Yes | List of recent changes (bullet points) |
| `current_decisions` | string[] | No | Active decisions. If omitted, preserves existing from file. |
| `next_steps` | string[] | No | Next steps (numbered list) |

Overwrites `activeContext.md` with proper structure and syncs to SQLite.

---

## 12. Layer 6 — VS Code Extension

The extension provides a visual interface for the memory bank directly in VS Code.

### 12.1 Sidebar Views

The extension adds a **Memory Bank** activity bar icon (book with neural node) that opens a sidebar with three views:

#### Files View

Displays the six core memory bank files in a flat list:

| File | Description |
|------|-------------|
| projectbrief | Foundation — goals, scope, requirements |
| productContext | Why the project exists, UX goals |
| systemPatterns | Architecture, design patterns |
| techContext | Tech stack, dependencies, constraints |
| activeContext | Current focus, recent changes, next steps |
| progress | What works, what remains, known issues |

**Icons:**
- Green file icon — file exists, click to open
- Red warning icon — file is missing

Each view has a **refresh** button in its title bar.

#### Tasks View

Lists all task files from `memory-bank/tasks/` with status indicators:

| Status | Icon |
|--------|------|
| In Progress | Spinning loader (blue) |
| Pending | Empty circle (yellow) |
| Completed | Checkmark (green) |
| Abandoned | X mark (red) |

Click any task to open its file.

#### Decisions View

Lists all ADR files from `memory-bank/decisions/` with status indicators:

| Status | Icon |
|--------|------|
| Accepted | Checkmark (green) |
| Proposed | Question mark (yellow) |
| Deprecated | Warning triangle (orange) |
| Superseded | Swap arrows (purple) |
| Rejected | Empty circle (yellow) |

Click any decision to open its file.

### 12.2 Status Bar

Two items on the left side of the status bar:

**Memory Bank status** (leftmost):
- Shows: `$(book) <current focus>` — extracted from `activeContext.md`'s "Current Focus" section (first 40 characters)
- Tooltip: `Memory Bank — N task(s)`
- Click: refreshes all views
- Falls back to `$(book) Memory Bank` if no active context

**MCP Server status** (next):
- Shows: `$(pass-filled) Memory Bank MCP` (green checkmark) when `.mcp.json` exists
- Shows: `$(circle-slash) Memory Bank MCP` (slash icon) when not configured
- Click: opens `.mcp.json` or offers to create it

### 12.3 Knowledge Graph Webview

Open via the **Show Knowledge Graph** command. Displays an interactive force-directed graph of all memory bank items:

**Node types and colors:**
- Blue — Core files
- Green — Tasks
- Yellow — Decisions

**Interactions:**
- **Hover** — shows tooltip with item title and type
- **Drag** — reposition nodes
- **Double-click** — opens the corresponding markdown file in the editor

Edges show directional relationships with labeled arrowheads (e.g., "references", "implements"). Cross-references between items are automatically detected from markdown content.

The graph uses VS Code theme variables so it matches your current color theme.

### 12.4 Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| **Memory Bank: Initialize Memory Bank** | Creates `memory-bank/` with all core files, `.gitignore`, and `.gitattributes` |
| **Memory Bank: Refresh** | Refreshes all sidebar views and the status bar |
| **Memory Bank: Open File** | Opens a memory bank file (used internally by tree views) |
| **Memory Bank: Show Knowledge Graph** | Opens the interactive knowledge graph webview |
| **Memory Bank: Toggle MCP Server** | Opens or creates the `.mcp.json` configuration file |

### 12.5 Configuration

Two settings in VS Code Settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `memoryBank.statusBar.enabled` | `true` | Show the memory bank status bar item |
| `memoryBank.fileWatcher.enabled` | `true` | Auto-refresh views when memory bank files change |

### 12.6 Automatic Git Integration

The extension automatically configures git integration on activation:

**1. Git-tracked database:**
On activation, the extension ensures `memory-bank/.gitignore` is configured to:
- **Allow** `memory-bank/.mcp/memory-bank.db` (the SQLite database)
- **Ignore** WAL/SHM/journal files (transient runtime artifacts)

And creates `memory-bank/.gitattributes` marking `*.db` as binary.

If these files already exist but are misconfigured (e.g., an older `.gitignore` that ignores the entire `.mcp/` directory), the extension patches them automatically.

**2. Pre-commit hook:**
On activation, the extension installs a git pre-commit hook that:
1. Checkpoints the SQLite WAL (flushes pending writes into the main `.db` file)
2. Auto-stages `memory-bank/.mcp/memory-bank.db`

The hook is idempotent — it uses marker comments (`# --- memory-bank-db-auto-stage ---`) and appends safely to any existing pre-commit hook. It handles git worktrees correctly.

**3. Session-stop WAL checkpoint:**
The Layer 4 session-stop hook also checkpoints the WAL when a Claude session ends, ensuring the database is always in a consistent state for git.

**Why commit the database?**
- It doesn't auto-rebuild — the MCP server creates an empty DB on startup
- Cross-reference links generated at import time may not reproduce identically
- ~300KB is negligible for git
- WAL/SHM/journal files remain gitignored since they're recreated at runtime

---

## 13. Workflows

### 13.1 Starting a Session

**With hooks (Layer 4):** Context is automatically injected. The SessionStart hook reads `activeContext.md`, `progress.md`, and `tasks/_index.md` and provides them to the agent.

**With MCP (Layer 5):** The agent calls `memory_recall` with `priority: "active"` to load the most relevant context within a token budget.

**Without hooks or MCP:** Tell the agent: "read the memory bank" or use `/memory-review`.

### 13.2 During a Session

The agent automatically:
- Creates ADRs when significant decisions are made
- Creates/updates tasks when starting or completing work
- Updates `activeContext.md` after significant work blocks
- Creates cross-reference links between related items

You can also explicitly:
- Use `/memory-update` to trigger a full review and update
- Use `/memory-task` to manage tasks
- Ask the agent to "update the memory bank"

### 13.3 Ending a Session

**With hooks (Layer 4):** The Stop hook checks if `activeContext.md` was updated recently. If not, it blocks the stop and asks the agent to save context first. It also checkpoints the SQLite WAL.

**Without hooks:** Tell the agent: "update memory bank before ending" or use `/memory-update`.

### 13.4 Task Management

**Creating tasks:**
```
"Create a task for implementing user authentication"
```
The agent creates `TASK-NNN-implement-user-authentication.md` with your request, develops an implementation plan, and updates the task index.

**Updating tasks:**
```
"Update TASK-001 — completed the login endpoint, starting on password reset"
```
The agent adds a dated progress log entry and updates subtask statuses.

**Querying tasks:**
```
"Show all active tasks"
"Show tasks completed this week"
```

### 13.5 Recording Decisions

Decisions are created automatically when the agent:
- Makes a significant architectural choice
- Corrects a misunderstanding
- Chooses a technology
- Reverses a previous decision

You can also explicitly ask: "Create an ADR for choosing PostgreSQL over MySQL."

---

## 14. File Reference

### Core Files

| File | Section | Content |
|------|---------|---------|
| `projectbrief.md` | Overview, Goals, Non-Goals, Success Criteria | Foundation document — everything derives from this |
| `productContext.md` | Why, Target Users, UX | Problem being solved and who it's for |
| `systemPatterns.md` | Architecture, Key Patterns, Components | How the system is built |
| `techContext.md` | Tech Stack, Dependencies, Constraints | Technologies and limitations |
| `activeContext.md` | Current Focus, Recent Changes, Decisions, Next Steps | What's happening right now |
| `progress.md` | What Works, What's Left, Known Issues | Overall project status |

### Task Files

| File | Format |
|------|--------|
| `tasks/_index.md` | Markdown table grouped by status (In Progress, Pending, Completed, Abandoned) |
| `tasks/TASK-NNN-slug.md` | H1 title, Status/Added/Updated metadata, Original Request, Implementation Plan, Progress Tracking table, Progress Log |

### Decision Files

| File | Format |
|------|--------|
| `decisions/_index.md` | Markdown table grouped by status (Proposed, Accepted, Deprecated, Superseded, Rejected) |
| `decisions/ADR-NNNN-slug.md` | H1 title, Status/Date/Deciders metadata, Context, Decision, Alternatives Considered, Consequences |

### Database

| File | Description |
|------|-------------|
| `.mcp/memory-bank.db` | SQLite database with FTS5 index. Auto-synced from markdown files. Committed to git. |
| `.mcp/memory-bank.db-wal` | WAL journal (gitignored, recreated at runtime) |
| `.mcp/memory-bank.db-shm` | Shared memory file (gitignored, recreated at runtime) |

---

## 15. Configuration Reference

### VS Code Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `memoryBank.statusBar.enabled` | boolean | `true` | Show the memory bank status bar item |
| `memoryBank.fileWatcher.enabled` | boolean | `true` | Watch memory bank files for changes and auto-refresh views |

### MCP Server Configuration (`.mcp.json`)

```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/build/index.js"],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `command` | Always `"node"` |
| `args` | Absolute path to the built MCP server entry point |
| `env.MEMORY_BANK_PATH` | Path to the `memory-bank/` directory. Use `${workspaceFolder}` for portability. |

### Hook Configuration (`memory-hooks.json`)

```json
{
  "hooks": {
    "SessionStart": [{ "type": "command", "command": "./path/to/session-start.sh", "timeout": 10 }],
    "PreCompact": [{ "type": "command", "command": "./path/to/pre-compact.sh", "timeout": 10 }],
    "Stop": [{ "type": "command", "command": "./path/to/session-stop.sh", "timeout": 10 }]
  }
}
```

Each hook supports platform-specific paths:
```json
{
  "type": "command",
  "command": "./hooks/scripts/session-start.sh",
  "linux": "./hooks/scripts/session-start.sh",
  "osx": "./hooks/scripts/session-start.sh",
  "windows": "powershell -File ./hooks/scripts/session-start.ps1",
  "timeout": 10
}
```

### Model Configuration (`memory-bank-config.json`)

```json
{
  "model": "Claude Opus (latest)",
  "_comment": "Agents inherit your VS Code Copilot default. Optionally pin with scripts/update-model.sh."
}
```

---

## 16. Troubleshooting

### Extension doesn't activate

**Symptom:** No "Memory Bank" icon in the activity bar.
**Cause:** The workspace doesn't contain `memory-bank/projectbrief.md`.
**Fix:** Run the **Memory Bank: Initialize Memory Bank** command from the Command Palette, or create the file manually.

### MCP server not connecting

**Symptom:** MCP tools are not available to the agent.
**Checklist:**
1. Is `.mcp.json` at the workspace root (not `.vscode/mcp.json`)?
2. Is the path in `args` an absolute path to `mcp/build/index.js`?
3. Was the server built? Run `cd mcp && npm install && npx tsc`.
4. Reload VS Code after creating/modifying `.mcp.json`.

### Status bar shows "no active context"

**Symptom:** Status bar shows generic text instead of your current focus.
**Cause:** `activeContext.md` is missing or doesn't have a "Current Focus" section.
**Fix:** Use `/memory-update` or ask the agent to update the active context.

### SQLite database is empty after clone

**Symptom:** MCP tools return no results after cloning the repository.
**Cause:** If the pre-commit hook wasn't installed before the last commit, the database may not have been committed.
**Fix:** The MCP server syncs markdown files on startup. Just restart VS Code. For a full re-import, use `memory_import_decisions` to re-import ADRs, then the file watcher will handle the rest.

### Pre-commit hook not working

**Symptom:** `memory-bank.db` isn't being auto-staged on commit.
**Checklist:**
1. Is `.git/hooks/pre-commit` executable? (`chmod +x .git/hooks/pre-commit`)
2. Does it contain the `# --- memory-bank-db-auto-stage ---` marker?
3. Is `memory-bank/.gitignore` correctly configured with `!.mcp/memory-bank.db`?
4. Reactivate the extension (reload VS Code) — it installs the hook on activation.

### FTS5 search returns no results

**Symptom:** `memory_search` returns empty results for terms you know exist.
**Checklist:**
1. Were the files synced? Check the MCP server output channel for "Database initialized" and sync messages.
2. FTS5 syntax: use `AND` (not `&&`), `OR` (not `||`), `prefix*` (not `prefix%`).
3. Try `memory_query` (structured query) instead of `memory_search` (full-text) to verify items exist.

### Hook scripts fail on macOS

**Symptom:** `stat: illegal option -- c` or similar errors.
**Cause:** macOS uses BSD `stat`, not GNU `stat`.
**Fix:** The scripts handle both formats. Ensure you're running bash (not sh): check the shebang line is `#!/bin/bash`.

---

## 17. FAQ

**Q: Can I edit memory bank files by hand?**
A: Yes. All memory bank files are plain markdown. The MCP server's file watcher will detect changes and sync them to SQLite automatically.

**Q: What happens if I delete the database?**
A: The MCP server creates a fresh database on startup and syncs all markdown files into it. You'll lose manually created links (those created via `memory_link` that aren't cross-references in markdown), but cross-references are re-detected automatically.

**Q: Can I use this with Claude Code CLI instead of VS Code Copilot?**
A: The hook scripts and MCP server work with Claude Code CLI. The VS Code extension and agent skills are VS Code-specific. The MCP config location differs: Claude Code CLI uses `.claude/settings.json`, not `.mcp.json`.

**Q: How big does the database get?**
A: Typically 100KB–500KB depending on the size of your memory bank. The FTS5 index adds ~30% overhead. WAL/SHM files can temporarily add another 100–200KB but are gitignored.

**Q: Do I need to install all 7 layers?**
A: No. Each layer is optional. Start with Layer 0 (one file) and add more as needed. Many projects work well with just Layers 0–2.

**Q: Can multiple developers share a memory bank?**
A: The memory bank is designed for single-developer use. In a team, each developer would have their own memory bank (e.g., different branches or workspaces). The SQLite database is a binary file, so merge conflicts are possible in multi-developer git workflows.

**Q: What models are supported?**
A: The project is built for Claude models via the Claude Agent SDK. Claude Opus (latest) is recommended. Agents inherit your VS Code Copilot default model — no model pinning is hardcoded.

**Q: How do I update to a newer version?**
A: Re-copy the files from the updated repository. Existing memory bank content (`memory-bank/` directory) is preserved. The MCP server will re-sync on restart.
