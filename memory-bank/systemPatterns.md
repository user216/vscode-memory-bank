# System Patterns

## Architecture: Layered Enhancement
The core architecture is a 7-layer stack where each layer adds capabilities without requiring layers above it. Layer 0 is the foundation (the original memory-bank instruction), and each subsequent layer enhances it.

```
Layer 6: VS Code Extension (UI, file watchers, events)
Layer 5: MCP Server (structured queries, search, token budgeting)
Layer 4: Hooks (automatic lifecycle capture/injection)
Layer 3: Custom Agents (Plan/Act personas, handoffs)
Layer 2: Prompt Files (user-invoked workflows)
Layer 1: Agent Skill (on-demand capability bundle)
Layer 0: Custom Instructions (always-on conventions) ← original memory-bank instruction
```

## Design Patterns

### Additive Compatibility
Every enhancement to the original instruction must be additive. The original instruction's 7 core files, 3 workflows (Plan/Act/Task), and task commands (add/update/show) remain unchanged. New features are added as new sections, new files, or new folders.

### Progressive Disclosure
Following the Agent Skills pattern: Layer 1 only loads its `SKILL.md` frontmatter (name + description) into context. Full instructions load only when the skill is invoked. Resource files load only when referenced. This keeps context window usage minimal.

### Graceful Degradation
If a higher layer fails or is unavailable:
- MCP server down → agent falls back to file-based read/write (Layer 0 behavior)
- Hooks not configured → agent manually follows instruction conventions
- Skill not installed → instruction file still works standalone

### Memory Bank File Hierarchy (from original instruction)
```
projectbrief.md          ← foundation document
├── productContext.md    ← why, problems, UX goals
├── systemPatterns.md    ← architecture, design patterns
├── techContext.md       ← technologies, constraints
├── activeContext.md     ← current focus, recent changes
├── progress.md          ← what works, what remains
├── tasks/               ← task management
│   ├── _index.md        ← master index by status
│   └── TASKID-*.md      ← individual task files
└── decisions/           ← ADRs (new, additive)
    ├── _index.md        ← decision log by status
    └── ADR-NNNN-*.md    ← individual decision records
```

### Hook Event Mapping
| Lifecycle Event | Memory Bank Action |
|----------------|-------------------|
| SessionStart | Inject activeContext.md + recent progress |
| PreCompact | Save activeContext.md snapshot |
| Stop | Persist session summary to progress.md |
| PostToolUse (file changes) | Update relevant observations |

## Component Relationships
- Instructions (L0) define the conventions all other layers follow
- Skills (L1) bundle instructions + templates + scripts, loaded on-demand when relevant
- Prompts (L2) provide user-facing slash commands that invoke skill workflows
- Agents (L3) are personas that use prompts and skills with all available tools, guided by instructions
- Hooks (L4) automate what instructions tell the agent to do manually
- MCP (L5) provides capabilities that file tools cannot (search, token budgeting)
- Extension (L6) provides UI and editor events that MCP cannot access
