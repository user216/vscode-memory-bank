# TASK-002: Layer 6 — VS Code Extension + MCP Write Tools + Plugin Compliance

**Status:** Completed
**Priority:** High
**Created:** 2026-03-09
**Updated:** 2026-03-10

## Description
Build the Layer 6 VS Code extension with sidebar tree views, status bar, Knowledge Graph webview, MCP server lifecycle manager. Add MCP write tools. Achieve Copilot plugin compliance. Fix known issues across Layers 0-5.

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
| 11 | Knowledge Graph webview (force-directed, interactive) | Done |
| 12 | MCP server lifecycle manager (start/stop/toggle, status bar) | Done |
| 13 | MCP write tools (create_task, update_status, save_context) | Done |
| 14 | Copilot plugin manifests (.github/plugin/, .claude-plugin/) | Done |
| 15 | Standard community files (CONTRIBUTING, SECURITY) | Done |
| 16 | Changelogs (root, extension, mcp) | Done |
| 17 | Extension v0.2.0 VSIX packaging and install | Done |
| 18 | MCP-first instructions update across Layers 0-3 | Done |
| 19 | Agent identity + MCP config documentation (ADR-0005, ADR-0006) | Done |
| 20 | Build and verify (65/65 MCP tests, extension compiles) | Done |

## Progress Log

### 2026-03-10
Fixed MCP status bar button (v0.2.1) — removed broken server toggle, made informational. Added automatic memory bank update rules to Layer 0 instructions.
- **2026-03-09**: Created extension scaffold with all core features. Fixed 3 known issues (test isolation, update-model.sh, hook scripts). Refined both agents. Added Knowledge Graph webview with force-directed layout. Added MCP server lifecycle manager. Added 3 MCP write tools. Achieved Copilot plugin compliance with manifests. Documented agent identity (ADR-0005) and MCP config location (ADR-0006). All tests passing, extension v0.2.0 packaged and installed.

## References
- ADR-0002 (layered architecture — this implements Layer 6)
- ADR-0005 (agent identity — Claude Agent Preview, not Claude Code)
- ADR-0006 (MCP config at .mcp.json project root)
- TASK-001 (initial scaffolding — this continues from there)
