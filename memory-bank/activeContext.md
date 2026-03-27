# Active Context

## Current Focus
Memory Bank v2 — fully implemented and installed. Extension v0.3.1, MCP server v2.0.0, plugin v0.4.0.

## Recent Changes
- Replaced `better-sqlite3` with `minisearch` + `gray-matter` — zero native dependencies
- Created `index-store.ts` with in-memory Map + MiniSearch + adjacency lists
- Updated all 14 tool files from SQL → Map/array operations
- Added 3 new tools: `memory_status`, `memory_tags`, `memory_create_note`
- Extension v0.3.1: MCP Setup sidebar, no `.mcp.json` generation, config won't overwrite
- Copilot plugin v0.4.0: removed bundled MCP server (ADR-0017), now skills/agents/hooks only
- 99 tests passing across 4 test files

## Current Decisions
- ADR-0014: Storage Format Analysis (Accepted) — markdown remains source of truth
- ADR-0015: v2 Architecture (Accepted) — Obsidian-Zettelkasten paradigm
- ADR-0016: Eliminate SQLite (Accepted) — MiniSearch + gray-matter, zero native deps
- ADR-0017: Remove MCP from plugin (Accepted) — extension delivers MCP exclusively
- ADR-0006: MCP config .mcp.json (Deprecated) — Claude Agent SDK no longer uses it
- ADR-0008: Auto-commit DB (Deprecated) — no longer applicable

## Next Steps
1. Migrate this project's own memory-bank to v2 flat layout
2. Real-world testing across different projects
3. End-to-end testing of bundled VSIX in clean environment
