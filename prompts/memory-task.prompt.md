---
description: 'Create, update, or query tasks in the Memory Bank'
mode: 'agent'
tools: ['editFiles', 'codebase', 'search']
---

# Manage Memory Bank Tasks

Work with tasks in the Memory Bank task management system.

## Commands
Based on user input, perform one of:

### Create Task
1. Generate next sequential TASK ID
2. Create task file from template in `memory-bank/tasks/TASKID-taskname.md`
3. Document the original request, thought process, and implementation plan
4. Update `memory-bank/tasks/_index.md`

### Update Task
1. Find the task file by ID
2. Add a progress log entry with today's date
3. Update subtask statuses in the tracking table
4. Sync status in `memory-bank/tasks/_index.md`

### Show Tasks
1. Read `memory-bank/tasks/_index.md`
2. Apply the requested filter (all, active, pending, completed, blocked, recent)
3. Present results in a clear format
