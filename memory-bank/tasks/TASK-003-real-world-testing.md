# TASK-003: Real-World Testing Across Projects

**Status:** Pending
**Priority:** High
**Added:** 2026-03-09
**Updated:** 2026-03-09

## Original Request
Test the complete vscode-memory-bank toolkit (all 7 layers + MCP server + extension) on real projects to validate it works end-to-end outside of its own repository.

## Implementation Plan
1. Install the plugin on a different VS Code project
2. Run `/memory-init` to initialize a new memory bank
3. Test MCP tools (all 9: recall, search, query, link, graph, schema, create_task, update_status, save_context)
4. Test hooks (SessionStart, PreCompact, Stop) fire correctly
5. Test extension sidebar (Files, Tasks, Decisions views populate)
6. Test Knowledge Graph webview renders correctly
7. Test agent workflows (Planner → Worker handoff)
8. Test prompt files (/memory-update, /memory-review, /memory-task)
9. Verify cross-project portability (different OS, different project structures)

## Progress Log

### 2026-03-09
Task created.
