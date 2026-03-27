---
type: core
title: System Patterns
created: 2026-03-09
updated: 2026-03-27
tags: [architecture, patterns]
---
# System Patterns

## Architecture: Component-Based Enhancement
The architecture is a set of independent components. Each adds capabilities without requiring the others.

```
VS Code Extension  →  MCP Server delivery, sidebar UI, file watchers
MCP Server         →  Structured queries, search, token budgeting, knowledge graph
Copilot Plugin     →  Skills + agents + hooks + prompts distribution
Custom Instructions →  Always-on memory bank conventions (foundation)
```

## Design Patterns

### Additive Compatibility
Every enhancement to the original instruction must be additive. The original instruction's core files, workflows (Plan/Act/Task), and task commands remain unchanged.

### Obsidian-Zettelkasten Paradigm (v2)
- **Flat layout**: All items in `memory-bank/` root (no subdirectories)
- **YAML frontmatter**: `---` delimited metadata (type, status, created, tags)
- **Wikilinks**: `[[TASK-001]]`, `[[ADR-0015]]` for cross-references
- **Inline tags**: `#backend`, `#performance` for categorization
- **Naming**: `TASK-NNN.md`, `ADR-NNNN.md`, `NOTE-NNN.md`

### Progressive Disclosure
Skills only load `SKILL.md` frontmatter into context initially. Full instructions load on invocation. Resource files load only when referenced.

### Graceful Degradation
- MCP server down → agent falls back to file-based read/write
- Hooks not configured → agent manually follows instruction conventions
- Skill not installed → instruction file still works standalone

### Memory Bank File Layout (v2)
```
memory-bank/
├── projectbrief.md      ← foundation document
├── productContext.md     ← why, problems, UX goals
├── systemPatterns.md     ← architecture, design patterns
├── techContext.md        ← technologies, constraints
├── activeContext.md      ← current focus, recent changes
├── progress.md           ← what works, what remains
├── TASK-NNN.md           ← task files (flat, YAML frontmatter)
├── ADR-NNNN.md           ← decision records (flat, YAML frontmatter)
└── NOTE-NNN.md           ← knowledge notes (flat, YAML frontmatter)
```

### Hook Event Mapping
| Lifecycle Event | Memory Bank Action |
|----------------|-------------------|
| SessionStart | Inject activeContext.md + recent progress |
| PreCompact | Save activeContext.md snapshot |
| Stop | Persist session summary to progress.md |

## Component Relationships
- **Instructions** define conventions all other components follow
- **Skills** bundle instructions + templates, loaded on-demand
- **Prompts** provide user-facing slash commands
- **Agents** are personas that use prompts and skills with all tools
- **Hooks** automate what instructions tell the agent to do manually
- **MCP Server** provides search, graph, token budgeting (17 tools)
- **Extension** delivers MCP server, provides sidebar UI, file watchers
