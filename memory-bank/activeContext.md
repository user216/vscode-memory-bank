---
type: core
title: Active Context
created: 2026-03-09
updated: 2026-03-27
tags: [context, current]
---
# Active Context

## Current Focus
Tester feedback fixes complete. MCP server v2.1.0 (20 tools), Extension v0.4.0 (Notes sidebar), v1 migration tool added.

## Recent Changes
- Added 3 new MCP tools: `memory_bulk_update_status`, `memory_add_tag`, `memory_migrate_v1` ([[ADR-0019]])
- Added Notes sidebar section to extension (`NotesTreeProvider`)
- Fixed status parsing: 3-tier pattern (YAML → bold → heading) across all layers
- Added `STATUS_ALIASES` and `resolveStatus()` to shared-utils
- Updated `memoryBank.init` to v2 flat layout (no subdirectories)
- Deleted orphaned NOTE-001/002/003.md, SQLite DB, stale .gitattributes
- Extension v0.4.0, MCP server v2.1.0

## Current Decisions
- [[ADR-0019]]: Tester Feedback — new tools, sidebar notes, v1 migration (Accepted)
- [[ADR-0015]]: v2 Architecture (Accepted) — Obsidian-Zettelkasten paradigm
- [[ADR-0016]]: Eliminate SQLite (Accepted) — MiniSearch + gray-matter
- [[ADR-0017]]: Remove MCP from plugin (Accepted) — extension delivers MCP exclusively
- [[ADR-0018]]: Bundle MCP deps in VSIX (Accepted) — .vscodeignore fix, path refresh

## Next Steps
1. Real-world testing across different projects ([[TASK-003]])
2. End-to-end testing of bundled VSIX in clean environment
3. Fix `chat.pluginLocations` path (should point to `copilot-plugin/` subdir)
