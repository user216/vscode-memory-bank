# Layer 0: Custom Instructions

**Status:** Built
**VS Code Primitive:** Custom Instructions (`.instructions.md`)
**Dependencies:** None
**File:** `instructions/memory-bank.instructions.md`

## What It Does

Layer 0 is the foundation — a single instruction file that teaches the AI agent how to maintain a Memory Bank. It defines:

- **7 core files** that comprise the memory bank
- **3 workflows** (Plan Mode, Act Mode, Task Management)
- **Task commands** (add/create, update, show with filters)
- **Documentation triggers** (when to update memory bank files)
- **Project intelligence** (learning journal for patterns and preferences)

This layer is fully compatible with the [original memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) from github/awesome-copilot, with one additive extension: a `decisions/` folder for Architectural Decision Records (ADRs).

## What It Adds Over the Original

| Feature | Original | Layer 0 |
|---------|----------|---------|
| 7 core files | Yes | Yes (identical) |
| Plan/Act/Task workflows | Yes | Yes (identical) |
| Task commands | Yes | Yes (identical) |
| `decisions/` folder | No | Yes (additive) |
| ADR template | No | Yes (additive) |
| Decision commands | No | Yes (additive) |

## Installation

### Option A: Copy to .github/instructions/ (recommended)
```bash
mkdir -p .github/instructions
cp vscode-memory-bank/instructions/memory-bank.instructions.md .github/instructions/
```

The `applyTo: '**'` frontmatter ensures it applies to all files in the workspace.

### Option B: Copy to project root
```bash
cp vscode-memory-bank/instructions/memory-bank.instructions.md .
```

## How It Works

### Agent Behavior
When the instruction is active, the AI agent will:
1. Read ALL memory bank files at the start of every task
2. Follow Plan Mode or Act Mode workflows depending on the task
3. Create and manage task files using the task commands
4. Update memory bank files after significant changes
5. Respond to "update memory bank" by reviewing all files

### Memory Bank File Hierarchy

```
memory-bank/
├── projectbrief.md        ← Foundation: scope, goals, non-goals
├── productContext.md      ← Why: purpose, problems, UX goals
├── systemPatterns.md      ← How: architecture, patterns, components
├── techContext.md         ← With what: tech stack, constraints, deps
├── activeContext.md       ← Now: current focus, recent changes, next steps
├── progress.md            ← Status: what works, what remains, known issues
├── tasks/                 ← Work: task management
│   ├── _index.md          ← Master index by status
│   └── TASKID-*.md        ← Individual task files
└── decisions/             ← Why (historical): ADRs [additive]
    ├── _index.md          ← Decision log by status
    └── ADR-NNNN-*.md      ← Individual decision records
```

### Core Workflows

**Plan Mode** — Read memory bank → verify completeness → develop strategy → present approach

**Act Mode** — Check memory bank → update documentation → execute task → document changes

**Task Management** — Create task file → document thought process → create plan → update index → execute → log progress

## What This Layer Does NOT Provide
- Automatic context capture (agent must follow instructions voluntarily)
- Structured search (agent reads full files)
- Token budgeting (agent loads everything)
- Slash commands (user must describe what they want)
- Lifecycle automation (no hooks)

These gaps are filled by Layers 1-6.

## Configuration

No configuration needed. The instruction applies automatically via the `applyTo: '**'` frontmatter.

## Compatibility

This instruction is designed to work with:
- VS Code + GitHub Copilot extension + Claude Agent SDK (agent mode, Claude models only)
- The original memory-bank instruction users (zero migration needed)
