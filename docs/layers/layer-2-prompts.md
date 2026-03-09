# Layer 2: Prompt Files

**Status:** Built
**VS Code Primitive:** Prompt Files (`.prompt.md`)
**Dependencies:** Layer 0
**Directory:** `prompts/`

## What It Does

Layer 2 provides user-invoked slash commands for common memory bank operations. Each prompt file defines a specific workflow the user can trigger by typing `/` in the chat input.

While Layer 0 relies on the agent understanding natural language requests ("update the memory bank"), and Layer 1 provides a single skill entry point, Layer 2 gives users **direct, named commands** for specific operations.

## What It Adds Over Layers 0-1

| Feature | Layer 0 | Layer 1 | Layer 2 |
|---------|---------|---------|---------|
| Initialize memory bank | Describe in chat | `/managing-memory-bank init` | `/memory-init` |
| Update all files | "update memory bank" | Auto-detected | `/memory-update` |
| Review context | Describe in chat | Auto-detected | `/memory-review` |
| Manage tasks | "create task" / "show tasks" | Auto-detected | `/memory-task` |
| Command discoverability | Must know the words | One entry point | 4 specific commands in `/` menu |

## Commands

### `/memory-init`
**File:** `prompts/memory-init.prompt.md`
**Purpose:** Initialize Memory Bank structure for a new project

What it does:
1. Checks if `memory-bank/` folder exists
2. If not, creates the full directory structure
3. Creates all 7 core files + tasks/_index.md + decisions/_index.md
4. Analyzes the codebase to populate initial content
5. Asks the user to review projectbrief.md

When to use:
- Starting a new project
- Adding memory bank to an existing project
- First-time setup

### `/memory-update`
**File:** `prompts/memory-update.prompt.md`
**Purpose:** Review and update all Memory Bank files to reflect current state

What it does:
1. Reads ALL memory bank files systematically
2. Compares documented state vs current codebase
3. Updates activeContext.md, progress.md, task statuses
4. Adds newly discovered patterns to systemPatterns.md
5. Reports summary of all changes made

When to use:
- After a significant coding session
- Before ending work for the day
- When the user says "update memory bank"
- After major refactoring or feature completion

### `/memory-review`
**File:** `prompts/memory-review.prompt.md`
**Purpose:** Read Memory Bank and present full project context summary

What it does:
1. Reads all memory bank files
2. Presents a structured summary (project, architecture, tech, state, progress, tasks, decisions)
3. Flags inconsistencies between files
4. Asks if context is still accurate

When to use:
- Starting a new session
- After a long break from the project
- When the agent seems to have lost context
- To verify memory bank accuracy

### `/memory-task`
**File:** `prompts/memory-task.prompt.md`
**Purpose:** Create, update, or query tasks in the Memory Bank

What it does:
- **Create:** Generates task file from template, updates index
- **Update:** Adds progress log entry, updates statuses, syncs index
- **Show:** Displays filtered task list (all, active, pending, completed, blocked, recent)

When to use:
- Adding new work items
- Logging progress on current tasks
- Reviewing what work is pending

## Installation

### Copy to .github/prompts/ (recommended)
```bash
mkdir -p .github/prompts
cp vscode-memory-bank/prompts/*.prompt.md .github/prompts/
```

After copying, the commands appear in the `/` menu in VS Code Copilot chat.

## Prompt File Format

Each prompt file has YAML frontmatter:
```yaml
---
description: 'Short description shown in / menu'
mode: 'agent'
---
```

- `mode: 'agent'` — runs in agent mode (multi-turn, can use tools)
- `tools` — optional; omit to allow all available tools (recommended to avoid "tool blocked" errors)

The body contains markdown instructions that are prepended to the user's chat message when the prompt is invoked.

## What This Layer Does NOT Provide
- Automatic invocation (user must type `/` commands) (→ Layer 1 for auto-detection)
- Dedicated Plan/Act agent personas (→ Layer 3)
- Lifecycle automation (→ Layer 4)
- Structured search (→ Layer 5)

## Compatibility
- Requires VS Code with GitHub Copilot extension + Claude Agent SDK (agent mode)
- Prompts appear alongside other slash commands in the chat input
- Designed for Claude models only (the only models supported by GitHub Copilot's Claude Agent SDK)
