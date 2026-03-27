---
type: core
title: Active Context
created: 2026-03-09
updated: 2026-03-27
tags: [context, current]
---
# Active Context

## Current Focus
Memory Bank v2 migration complete. Extension v0.3.1, MCP server v2.0.0, plugin v0.4.0. Migrated own memory-bank to v2 flat layout.

## Recent Changes
- Migrated memory-bank to v2 flat layout (no more `tasks/`, `decisions/` subdirectories)
- Added YAML frontmatter to all core files, tasks, and decisions
- Config generator fix: always refreshes MCP server path on activation, preserves user env
- Fixed VSIX missing MCP deps — removed `mcp-server/node_modules/**` from `.vscodeignore` ([[ADR-0018]])
- Extension v0.3.1: MCP Setup sidebar, no `.mcp.json` generation
- Copilot plugin v0.4.0: removed bundled MCP server ([[ADR-0017]])
- MCP server v2.0.0: MiniSearch + gray-matter, zero native deps ([[ADR-0016]])

## Current Decisions
- [[ADR-0015]]: v2 Architecture (Accepted) — Obsidian-Zettelkasten paradigm
- [[ADR-0016]]: Eliminate SQLite (Accepted) — MiniSearch + gray-matter
- [[ADR-0017]]: Remove MCP from plugin (Accepted) — extension delivers MCP exclusively
- [[ADR-0018]]: Bundle MCP deps in VSIX (Accepted) — .vscodeignore fix, path refresh
- [[ADR-0006]]: MCP config .mcp.json (Deprecated) — no longer used
- [[ADR-0008]]: Auto-commit DB (Deprecated) — no longer applicable

## Next Steps
1. Real-world testing across different projects ([[TASK-003]])
2. End-to-end testing of bundled VSIX in clean environment
3. Fix `chat.pluginLocations` path (should point to `copilot-plugin/` subdir)
