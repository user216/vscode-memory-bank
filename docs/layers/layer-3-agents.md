# Layer 3: Custom Agents

**Status:** Built
**VS Code Primitive:** Custom Agents (`.agent.md`)
**Dependencies:** Layers 0-2
**Directory:** `agents/`

## What It Does

Layer 3 provides specialized AI personas for memory bank workflows. Instead of a single general-purpose agent, it splits the work into two dedicated agents with distinct roles and a handoff workflow between them.

This implements the **Plan/Act mode** pattern from the original memory-bank instruction as actual, separate agents — each with its own behavioral rules, startup protocol, and handoff triggers.

## What It Adds Over Layers 0-2

| Feature | Layers 0-2 | Layer 3 |
|---------|------------|---------|
| Plan vs Act separation | Agent switches modes mentally | Two separate agents with distinct instructions |
| Mode discipline | Agent may forget which mode it's in | Each agent has one job — no confusion |
| Workflow handoffs | User manually switches modes | One-click handoff buttons between agents |
| Startup protocols | Agent must be told what to read | Each agent auto-reads the right memory bank files |
| Subagent orchestration | Not available | Agents can spawn each other |

## Model

Agents do **not** pin a model version in their frontmatter. They inherit whatever model you have configured as your default in VS Code Copilot settings. This means:
- When a new Claude model releases, you update your VS Code settings — agents automatically use it
- No files to edit, no scripts to run
- The recommended model is documented in `memory-bank-config.json` (currently: Claude Opus latest)
- If you need to pin a specific version for testing, use `./scripts/update-model.sh "Claude Opus 5"` to add explicit `model:` fields

## Agents

### Memory Planner
**File:** `agents/memory-planner.agent.md`
**Role:** Plan Mode — read, analyze, strategize, document plans

```yaml
name: Memory Planner
# No model field — inherits user's default (recommended: Claude Opus latest)
# No tools restriction — all tools available, behavior guided by instructions
```

**Startup Protocol:**
1. Reads ALL memory bank files in dependency order
2. Verifies all files are complete and consistent
3. Flags missing or incomplete files

**What it does:**
- Analyzes current project state from Memory Bank
- Researches the codebase to understand the problem
- Develops implementation strategy with steps, risks, alternatives
- Creates or updates task files documenting the plan
- Records architectural decisions as ADRs
- Presents the plan, then offers handoff to Worker

**What it should NOT do (enforced by instructions, not tool restrictions):**
- Edit source code files
- Run build/test commands
- Make any code changes

**Handoff:** After presenting a plan, shows a button:
> **Execute Plan** → switches to Memory Worker with prompt: "Implement the plan outlined above. Update the Memory Bank with progress as you work."

### Memory Worker
**File:** `agents/memory-worker.agent.md`
**Role:** Act Mode — execute plans, write code, update memory

```yaml
name: Memory Worker
# No model field — inherits user's default
# Broad tool access — no artificial restrictions
```

**Startup Protocol:**
1. Reads activeContext.md for current focus
2. Reads tasks/_index.md for active tasks
3. Reads the specific task file if referenced

**What it does:**
- Executes implementation plans step by step
- Writes and edits source code
- Runs tests and builds
- Updates Memory Bank after each significant change:
  - Task file progress tracking table and log
  - activeContext.md with current state
  - progress.md when milestones are reached
  - systemPatterns.md when new patterns are discovered
  - techContext.md when dependencies change

**Handoff:** When blocked or when a planning phase is needed, shows a button:
> **Review & Plan Next** → switches to Memory Planner with prompt: "Review the changes made and plan next steps. Update the Memory Bank context."

## Workflow

```
User request
    │
    ▼
┌──────────────┐     handoff      ┌──────────────┐
│   Memory     │ ──────────────>  │   Memory     │
│   Planner    │                  │   Worker     │
│              │  <──────────────  │              │
│ - Read code  │     handoff      │ - Write code │
│ - Analyze    │                  │ - Run tests  │
│ - Strategize │                  │ - Update MB  │
│ - Create ADR │                  │ - Log tasks  │
│ - Plan tasks │                  │ - Build      │
└──────────────┘                  └──────────────┘
   Plans only                        Full execution
```

The user can also invoke either agent directly:
- Select "Memory Planner" from the agents dropdown for analysis/planning
- Select "Memory Worker" from the agents dropdown for execution

## Installation

### Copy to .github/agents/ (recommended)
```bash
mkdir -p .github/agents
cp vscode-memory-bank/agents/*.agent.md .github/agents/
```

### Copy to user profile (personal, cross-workspace)
Agents placed in the user profile folder are available across all workspaces.

## Agent Frontmatter Reference

```yaml
---
name: Agent Name                    # Display name in dropdown
description: What this agent does   # Shown as placeholder text
# model: omitted — inherits user default. Use update-model.sh to pin if needed
handoffs:                           # Transition buttons
  - label: Button Text              # Text shown on button
    agent: target-agent             # Agent to hand off to
    prompt: Context message         # Prompt sent to target agent
    send: false                     # false = user can edit before sending
---
```

Note: Both `model` and `tools` fields are omitted intentionally. When omitted, agents inherit the user's default model and have access to all available tools. Behavioral constraints (e.g., "don't edit code") are enforced via instructions in the agent body. This avoids version staleness and "tool was called but blocked" errors.

## Why Two Agents Instead of One?

The original memory-bank instruction describes Plan and Act as mental modes — the agent is supposed to switch behavior based on context. In practice, this has problems:

1. **Mode confusion** — The agent forgets which mode it's in during long conversations.
2. **Context pollution** — A single long conversation accumulates irrelevant context. Fresh agents start clean.
3. **No handoff mechanism** — With one agent, mode transitions are implicit. With two, handoff buttons make transitions explicit and traceable.

Separate agents solve these: there's no mode to forget (each agent has one job), each starts with a fresh context focused on its role, and handoff buttons create clear transition points the user controls.

## What This Layer Does NOT Provide
- Automatic context injection at session start (→ Layer 4)
- Automatic context preservation before compaction (→ Layer 4)
- Structured search across memories (→ Layer 5)
- Visual agent state UI (→ Layer 6)

## Compatibility
- Requires VS Code 1.106+ with GitHub Copilot extension + Claude Agent SDK
- Handoffs require the `agent` tool to be available
- Agents inherit user's default model — no version pinning, no staleness
