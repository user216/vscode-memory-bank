# TASK-002: Layer 6 — VS Code Extension Scaffold

**Status:** Completed
**Priority:** High
**Created:** 2026-03-09
**Completed:** 2026-03-09

## Description
Build the Layer 6 VS Code extension with sidebar tree views, status bar, commands, and file watcher. Also fix known issues across Layers 0-5.

## Subtasks
| # | Subtask | Status |
|---|---------|--------|
| 1 | Fix test isolation (db-sync.test.ts race condition) | Done |
| 2 | Fix update-model.sh (add/remove model field) | Done |
| 3 | Fix hook scripts (jq-optional, stop hook loop prevention) | Done |
| 4 | Refine Planner agent (add tools, plan format) | Done |
| 5 | Refine Worker agent (add test rule) | Done |
| 6 | Scaffold extension package.json + tsconfig | Done |
| 7 | Implement sidebar tree views (Files, Tasks, Decisions) | Done |
| 8 | Implement status bar (active context + task count) | Done |
| 9 | Implement commands (refresh, openFile, init) | Done |
| 10 | Implement FileSystemWatcher for auto-refresh | Done |
| 11 | Build and verify (65/65 MCP tests, extension compiles) | Done |
| 12 | Update memory bank documentation | Done |

## Progress Log
- **2026-03-09**: Created extension scaffold with all core features. Fixed 3 known issues (test isolation, update-model.sh, hook scripts). Refined both agents. All tests passing, extension builds cleanly.

## References
- ADR-0002 (layered architecture — this implements Layer 6)
- TASK-001 (initial scaffolding — this continues from there)
