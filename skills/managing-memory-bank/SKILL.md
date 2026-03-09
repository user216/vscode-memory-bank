---
name: managing-memory-bank
description: >-
  Maintain AI project memory across sessions via structured documentation.
  Use when initializing Memory Bank for new/existing projects, updating
  memory bank docs (projectbrief, activeContext, progress, tasks, decisions),
  managing task files, creating ADRs, or reviewing context before starting work.
  Also use when the user says "update memory bank".
argument-hint: describe what you want to do with the memory bank
user-invocable: true
disable-model-invocation: false
---

# Managing Memory Bank Skill

You are managing a Memory Bank — a structured set of markdown files that persist project context across AI coding sessions.

## When This Skill Activates
- User mentions "memory bank", "update memory bank", "memory", "context"
- Starting a new session (need to read context)
- Before/after significant code changes (need to document)
- User creates, updates, or queries tasks
- User makes architectural decisions that should be recorded

## Core Operations

### Initialize Memory Bank
When a project has no `memory-bank/` folder:
1. Create `memory-bank/` directory
2. Create all 7 core files using templates
3. Ask user for project brief information
4. Populate projectbrief.md from user input
5. Derive initial productContext.md, systemPatterns.md, techContext.md from codebase analysis
6. Set activeContext.md to initial state
7. Set progress.md to initial state
8. Create tasks/_index.md and decisions/_index.md

Use templates from: [projectbrief template](./templates/projectbrief.md), [task template](./templates/task-template.md), [decision template](./templates/decision-template.md)

### Read Context (Session Start)
1. Read ALL memory bank files in order:
   - projectbrief.md (foundations)
   - productContext.md (purpose)
   - systemPatterns.md (architecture)
   - techContext.md (tech stack)
   - activeContext.md (current state)
   - progress.md (what's done/remaining)
   - tasks/_index.md (active work)
   - decisions/_index.md (key decisions)
2. Summarize current state to user
3. Ask if context is still accurate

### Update Memory Bank
When triggered by user saying "update memory bank" or after significant changes:
1. Review ALL files systematically
2. Update activeContext.md with current focus and recent changes
3. Update progress.md with current status
4. Update task statuses in tasks/_index.md
5. Add any new patterns to systemPatterns.md
6. Record any decisions in decisions/

### Manage Tasks
Follow the task commands from the memory bank instruction:
- **add/create task**: Create file + update index
- **update task [ID]**: Log progress + update statuses + sync index
- **show tasks [filter]**: Display filtered view

### Record Decisions
When an architectural or design decision is made:
1. Create ADR file in decisions/ with next sequential number
2. Document context, decision, alternatives considered, consequences
3. Update decisions/_index.md
4. ADRs are immutable once accepted — to change, create a new ADR that supersedes

## Important Rules
- ALWAYS read memory bank before starting work
- ALWAYS update memory bank after significant changes
- NEVER remove content from the original memory bank instruction
- ADRs are append-only (never edit accepted ADRs, only supersede)
- Task files track both table (quick scan) and narrative log (full context)
