---
description: 'Create, update, or query tasks in the Memory Bank'
mode: 'agent'
---

# Manage Memory Bank Tasks

Work with tasks in the Memory Bank task management system.

## Commands
Based on user input, perform one of:

### Create Task
1. Use `memory_query` (type: task) to find existing tasks and determine next sequential TASK ID, or read `tasks/_index.md`
2. Create task file from template in `memory-bank/tasks/TASKID-taskname.md`
3. Document the original request, thought process, and implementation plan
4. Update `memory-bank/tasks/_index.md`
5. Use `memory_link` to connect the task to related ADRs or other tasks if MCP available

### Update Task
1. Use `memory_search` to find the task by ID if MCP available, or read the task file directly
2. Add a progress log entry with today's date
3. Update subtask statuses in the tracking table
4. Sync status in `memory-bank/tasks/_index.md`

### Show Tasks
1. **Preferred**: Use `memory_query` with type and status filters if MCP tools are available
2. **Fallback**: Read `memory-bank/tasks/_index.md`
3. Apply the requested filter (all, active, pending, completed, blocked, recent)
4. Use `memory_graph` to show related decisions/items if MCP available
5. Present results in a clear format
