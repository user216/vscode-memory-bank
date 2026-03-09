# Layer 1: Agent Skill

**Status:** Built
**VS Code Primitive:** Agent Skills (`SKILL.md` + folder)
**Dependencies:** Layer 0
**Directory:** `skills/managing-memory-bank/`

## What It Does

Layer 1 packages the memory bank capability as an [Agent Skill](https://code.visualstudio.com/docs/copilot/customization/agent-skills) — a portable, self-contained folder of instructions, templates, and scripts that GitHub Copilot loads on-demand.

Unlike Layer 0 (always-on instructions), the skill only loads into context **when relevant** — when the agent detects the user wants to work with memory bank operations. This reduces context window usage during normal coding work.

## What It Adds Over Layer 0

| Feature | Layer 0 | Layer 1 |
|---------|---------|---------|
| Memory bank conventions | Always in context | Loaded on-demand |
| Templates | No | projectbrief, task, decision templates |
| Scripts | No | Initialization and validation scripts (planned) |
| Progressive loading | No | 3-level: discovery → instructions → resources |
| Portability | VS Code instructions | On-demand, loaded when relevant |
| Slash command | No | `/managing-memory-bank` |

## Structure

```
skills/managing-memory-bank/
├── SKILL.md                              ← Skill definition (frontmatter + instructions)
├── templates/
│   ├── projectbrief.md                   ← Template for new project briefs
│   ├── task-template.md                  ← Template for new task files
│   └── decision-template.md             ← Template for new ADRs
└── scripts/                              ← (Future) automation scripts
```

## Installation

### Option A: Copy to .github/skills/ (recommended)
```bash
cp -r vscode-memory-bank/skills/managing-memory-bank .github/skills/
```

### Option B: Copy to personal skills folder
```bash
cp -r vscode-memory-bank/skills/managing-memory-bank ~/.copilot/skills/
```

This makes the skill available across all your workspaces.

## How It Works

### Progressive Loading (3 levels)

1. **Discovery** — Copilot reads only the `name` and `description` from SKILL.md frontmatter. This happens for all installed skills and costs minimal tokens.

2. **Instructions** — When a user's request matches the skill description (e.g., mentions "memory bank", "update context", "create task"), Copilot loads the full SKILL.md body into context.

3. **Resources** — Templates and scripts are only loaded when the agent explicitly references them (e.g., when creating a new task file, it pulls the task template).

### Activation Triggers
The skill activates when the user mentions:
- "memory bank", "update memory bank", "memory", "context"
- Task operations: "create task", "update task", "show tasks"
- Decision operations: "record decision", "create ADR"
- Session start context: "what was I working on", "continue from last session"

### Core Operations
The skill defines 4 main operations:

1. **Initialize Memory Bank** — Creates the full folder structure and populates initial files from templates, analyzing the codebase for context.

2. **Read Context** — Reads all memory bank files in dependency order and summarizes current state.

3. **Update Memory Bank** — Systematically reviews and updates all files to reflect current project state.

4. **Manage Tasks** — Creates, updates, and queries task files following the task command protocol.

## Skill Frontmatter

```yaml
name: managing-memory-bank
description: >-
  Maintain AI project memory across sessions via structured documentation.
  Use when initializing Memory Bank, updating docs, managing tasks,
  creating ADRs, or reviewing context.
argument-hint: describe what you want to do with the memory bank
user-invocable: true
disable-model-invocation: false
```

- `user-invocable: true` — appears as `/managing-memory-bank` slash command
- `disable-model-invocation: false` — Copilot can also auto-invoke when relevant

## What This Layer Does NOT Provide
- Dedicated agent personas for Plan vs Act modes (→ Layer 3)
- Automatic lifecycle capture (→ Layer 4)
- Structured search across memories (→ Layer 5)
- Visual UI for memory state (→ Layer 6)

## Compatibility
- Target platform: VS Code + GitHub Copilot extension + Claude Agent SDK (Claude models only)
- Follows the [Agent Skills open standard](https://agentskills.io)
- Requires VS Code 1.106+ for skill support
