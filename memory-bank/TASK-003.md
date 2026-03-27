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
3. Test MCP tools (all 20 tools)
4. Test hooks (SessionStart, PreCompact, Stop)
5. Test extension sidebar (Files, Tasks, Decisions, Notes views)
6. Test Knowledge Graph webview
7. Test agent workflows (Planner to Worker handoff)
8. Verify cross-project portability

## Progress Log

### 2026-03-27
Tester feedback round complete (ADR-0019). Fixed: status parser, status aliases, added bulk_update_status/add_tag/migrate_v1 tools, added Notes sidebar. MCP server v2.1.0, extension v0.4.0. 115 MCP tests + 13 extension tests passing.

Migrated project's own memory-bank to v2 flat layout. Extension v0.3.1 installed and working. MCP server path refresh fixed.

### 2026-03-09
Task created.
