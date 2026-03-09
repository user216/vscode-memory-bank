---
description: 'Read Memory Bank and present full project context summary'
mode: 'agent'
---

# Review Memory Bank

Read all Memory Bank files and present a comprehensive project context summary.

## Steps
1. **Load context** — Use `memory_recall` with `priority: "foundational"` if MCP tools are available, otherwise read all files manually
2. **Check items** — Use `memory_query` to list tasks by status and `memory_schema` to see item counts if MCP available
3. **Explore connections** — Use `memory_graph` on active tasks to see related decisions if MCP available
4. Present a structured summary:
   - **Project**: scope, goals, non-goals (from projectbrief.md)
   - **Architecture**: key patterns and components (from systemPatterns.md)
   - **Tech Stack**: technologies and constraints (from techContext.md)
   - **Current State**: what's active, recent changes (from activeContext.md)
   - **Progress**: what works, what remains (from progress.md)
   - **Active Tasks**: in-progress and pending tasks
   - **Key Decisions**: recent accepted ADRs
   - **Knowledge Graph**: item counts, link relationships (from memory_schema if available)
5. Flag any inconsistencies between files
6. Ask if context is still accurate
