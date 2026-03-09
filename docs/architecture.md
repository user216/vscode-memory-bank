# Architecture Overview

## The 7-Layer Model

vscode-memory-bank uses a progressive enhancement architecture. Each layer builds on the ones below it, adding capabilities without requiring the layers above.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 6: VS Code Extension                  [PLANNED]  │
│  UI panels, file watchers, editor events                │
├─────────────────────────────────────────────────────────┤
│  Layer 5: MCP Server                         [BUILT]    │
│  Structured queries, FTS, token budgeting               │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Hooks                              [BUILT]    │
│  Automatic lifecycle capture/injection                  │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Custom Agents                      [BUILT]    │
│  Plan/Act personas with handoffs                        │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Prompt Files                       [BUILT]    │
│  User-invoked slash commands                            │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Agent Skill                        [BUILT]    │
│  On-demand capability bundle with templates              │
├─────────────────────────────────────────────────────────┤
│  Layer 0: Custom Instructions                [BUILT]    │
│  Always-on memory bank conventions                      │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Additive Compatibility
The original [memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) from github/awesome-copilot is the foundation. All changes are additive — nothing from the original is removed or modified. See [ADR-0001](../memory-bank/decisions/ADR-0001-additive-compatibility-with-original-instruction.md).

### 2. Progressive Enhancement
Each layer is optional. You can use:
- Layer 0 alone (identical to the original instruction)
- Layers 0-1 (instruction + skill with templates)
- Layers 0-2 (add slash commands)
- Layers 0-3 (add Plan/Act agent personas)
- Layers 0-4 (add automatic lifecycle hooks)
- Layers 0-5 (add structured search and token budgeting)
- Layers 0-6 (add VS Code UI, future)

### 3. Graceful Degradation
If a higher layer fails:
- MCP server crashes → agent falls back to file-based read/write
- Hooks not configured → agent manually follows instruction conventions
- Skill not installed → instruction file still works standalone
- Extension not installed → everything else works without UI

### 4. File-First Storage
All memory is stored as markdown files in the `memory-bank/` folder. These files are:
- Human-readable and editable
- Git-trackable (diffable, mergeable)
- Work with any text editor
- Don't require a database or server process

Higher layers (5, 6) may add structured storage (SQLite) but always maintain markdown as the source of truth.

## Layer Interaction Map

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Layer 3    │────>│   Layer 2    │────>│   Layer 1    │
│   Agents     │uses │   Prompts    │uses │   Skill      │
│              │     │              │     │              │
│ memory-      │     │ /memory-init │     │ SKILL.md     │
│ planner ───handoff──> memory-     │     │ + templates  │
│ memory-      │     │ worker       │     │ + scripts    │
│ worker       │     │              │     │              │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │ reads/writes                    references│
       ▼                                         ▼
┌──────────────────────────────────────────────────────────┐
│                    Layer 0: Instructions                  │
│              memory-bank.instructions.md                 │
│                                                          │
│  Defines: 7 core files, Plan/Act workflows,             │
│  task commands, documentation triggers                   │
└──────────────────────┬───────────────────────────────────┘
                       │ governs structure of
                       ▼
┌──────────────────────────────────────────────────────────┐
│                memory-bank/ folder                        │
│  projectbrief.md  productContext.md  systemPatterns.md   │
│  techContext.md   activeContext.md   progress.md         │
│  tasks/           decisions/                             │
└──────────────────────▲───────────────────────────────────┘
                       │ automates read/write
┌──────────────────────┴───────────────────────────────────┐
│                    Layer 4: Hooks                         │
│  SessionStart: inject context                            │
│  PreCompact: preserve context                            │
│  Stop: ensure context saved                              │
└──────────────────────────────────────────────────────────┘
```

## VS Code Primitives Mapping

| Layer | VS Code Primitive | File Location | Format |
|-------|-------------------|---------------|--------|
| 0 | Custom Instructions | `.github/instructions/` or project root | `.instructions.md` |
| 1 | Agent Skills | `.github/skills/managing-memory-bank/` | `SKILL.md` + folder |
| 2 | Prompt Files | `.github/prompts/` | `.prompt.md` |
| 3 | Custom Agents | `.github/agents/` | `.agent.md` |
| 4 | Hooks | `.github/hooks/` | `.json` + scripts |
| 5 | MCP Servers | `.vscode/mcp.json` | JSON config + server code |
| 6 | VS Code Extensions | VS Code Marketplace | `package.json` + TypeScript |

## Installation Paths

### Minimal (Layer 0 only)
Copy `instructions/memory-bank.instructions.md` to your project's `.github/instructions/` folder. Done.

### Standard (Layers 0-4)
Copy the relevant folders to your project's `.github/` directory. See individual layer docs for details.

### Full (Layers 0-6, future)
Install the VS Code extension from the marketplace. It bundles everything.

## Detailed Layer Documentation
- [Layer 0: Custom Instructions](layers/layer-0-instructions.md)
- [Layer 1: Agent Skill](layers/layer-1-skill.md)
- [Layer 2: Prompt Files](layers/layer-2-prompts.md)
- [Layer 3: Custom Agents](layers/layer-3-agents.md)
- [Layer 4: Hooks](layers/layer-4-hooks.md)
- [Layer 5: MCP Server](layers/layer-5-mcp.md)
- [Layer 6: VS Code Extension](layers/layer-6-extension.md)

## Research Sources
This project synthesizes ideas from:
- [github/awesome-copilot memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) — original memory bank instruction
- [GreatScottyMac/context-portal](https://github.com/GreatScottyMac/context-portal) — structured DB, knowledge graph, dual search
- [mkreyman/mcp-memory-keeper](https://github.com/mkreyman/mcp-memory-keeper) — channels, checkpoints, multi-session
- [WhenMoon-afk/claude-memory-mcp](https://github.com/WhenMoon-afk/claude-memory-mcp) — token budgeting, hybrid scoring
- [yuvalsuede/memory-mcp](https://github.com/yuvalsuede/memory-mcp) — hook-based capture, confidence decay
- [slaughters85j/claude-memory-mcp](https://github.com/slaughters85j/claude-memory-mcp) — semantic search, ONNX embeddings
- [mehdibizavar/claude-memory-mcp](https://github.com/mehdibizavar/claude-memory-mcp) — CLAUDE.md bridge
- [mem0ai/mem0](https://github.com/mem0ai/mem0) — multi-level memory, vector stores
- [tristan-mcinnis/claude-code-agentic-semantic-memory-system-mcp](https://github.com/tristan-mcinnis/claude-code-agentic-semantic-memory-system-mcp) — knowledge graph, local embeddings
- [eliasonAdvising/claude-memory-mcp](https://github.com/eliasonAdvising/claude-memory-mcp) — graph traversal, progressive disclosure
