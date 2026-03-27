---
type: task
status: In Progress
created: 2026-03-09
updated: 2026-03-27
tags: [testing, validation]
---
# TASK-003: Real-World Testing Across Projects

## Request
Test the complete vscode-memory-bank toolkit (MCP server + extension + plugin) on real projects to validate it works end-to-end outside of its own repository.

## Plan
1. Install the plugin on a different VS Code project
2. Initialize a new memory bank
3. Test MCP tools (all 17 tools)
4. Test hooks (SessionStart, PreCompact, Stop)
5. Test extension sidebar (Files, Tasks, Decisions views)
6. Test Knowledge Graph webview
7. Test agent workflows (Planner to Worker handoff)
8. Verify cross-project portability

## Progress Log

### 2026-03-27
Migrated project's own memory-bank to v2 flat layout. Extension v0.3.1 installed and working. MCP server path refresh fixed. Testing in progress.

### 2026-03-09
Task created.
