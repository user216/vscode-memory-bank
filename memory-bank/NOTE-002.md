---
type: note
tags: [architecture, patterns, design]
created: 2026-03-09
updated: 2026-03-27
related: [ADR-0002, ADR-0015]
---
# NOTE-002: System Patterns

## Architecture: Layered Enhancement
The core architecture is a 7-layer stack where each layer adds capabilities without requiring layers above it. Layer 0 is the foundation (the original memory-bank instruction), and each subsequent layer enhances it.

## Design Patterns

### Additive Compatibility
Every enhancement to the original instruction must be additive. The original instruction's core files, workflows, and task commands remain unchanged. New features are added as new sections, files, or folders.

### Progressive Disclosure
Layer 1 only loads its `SKILL.md` frontmatter (name + description) into context. Full instructions load only when the skill is invoked. Resource files load only when referenced. This keeps context window usage minimal.

### Graceful Degradation
If a higher layer fails or is unavailable:
- MCP server down → agent falls back to file-based read/write (Layer 0 behavior)
- Hooks not configured → agent manually follows instruction conventions
- Skill not installed → instruction file still works standalone

### Hook Event Mapping
| Lifecycle Event | Memory Bank Action |
|----------------|-------------------|
| SessionStart | Inject context via `memory_recall` |
| PreCompact | Save context snapshot |
| Stop | Persist session summary to tasks |

## Component Relationships
- Instructions (L0) define the conventions all other layers follow
- Skills (L1) bundle instructions + templates + scripts, loaded on-demand
- Prompts (L2) provide user-facing slash commands that invoke skill workflows
- Agents (L3) are personas that use prompts and skills with all available tools
- Hooks (L4) automate what instructions tell the agent to do manually
- MCP (L5) provides capabilities that file tools cannot (search, token budgeting)
- Extension (L6) provides UI and editor events that MCP cannot access
