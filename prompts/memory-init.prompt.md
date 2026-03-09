---
description: 'Initialize Memory Bank structure for the current project'
mode: 'agent'
---

# Initialize Memory Bank

Read the current project structure and create a Memory Bank if one does not exist.

## Steps
1. Check if `memory-bank/` folder exists in the workspace root
2. If it exists:
   a. Use `memory_recall` with `priority: "foundational"` to load context if MCP tools are available
   b. Otherwise read all files manually
   c. Report current state
3. If it does not exist:
   a. Create the `memory-bank/` directory
   b. Create all core files: projectbrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, progress.md
   c. Create `tasks/_index.md` and `decisions/_index.md`
   d. Analyze the codebase to populate initial content
   e. Ask the user to review and confirm the projectbrief.md

Use the templates from the managing-memory-bank skill if available.
