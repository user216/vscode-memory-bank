---
description: 'Review and update all Memory Bank files to reflect current project state'
mode: 'agent'
---

# Update Memory Bank

Systematically review and update all Memory Bank files.

## Steps
1. **Load current state** — Use `memory_recall` with `priority: "active"` if MCP tools are available, otherwise read all files manually
2. Use `memory_search` to find items related to recent work if MCP available
3. Analyze current codebase state vs documented state
4. Update activeContext.md with current focus and recent changes
5. Update progress.md with what's working, what remains, known issues
6. Update task statuses in tasks/_index.md and individual task files
7. Add any new patterns discovered to systemPatterns.md
8. Use `memory_link` to connect new/modified items to related tasks and decisions if MCP available
9. Report summary of all changes made
