# Active Context

## Current Focus
Memory Bank v2 implementation — completed ADR-0015 (Zettelkasten architecture) and ADR-0016 (eliminate SQLite)

## Recent Changes
- Replaced `better-sqlite3` with `minisearch` + `gray-matter` — zero native dependencies
- Created `index-store.ts` with in-memory Map + MiniSearch + adjacency lists
- Updated all 14 tool files from SQL → Map/array operations
- Added 3 new tools: `memory_status`, `memory_tags`, `memory_create_note`
- Added YAML frontmatter parsing, wikilink extraction, inline tag extraction
- Updated VS Code extension: eliminated runtime `npm install`, dual-layout support
- 99 tests passing across 4 test files

## Current Decisions
- ADR-0014: Storage Format Analysis (Accepted) — markdown remains source of truth
- ADR-0015: v2 Architecture (Accepted) — Obsidian-Zettelkasten paradigm
- ADR-0016: Eliminate SQLite (Accepted) — MiniSearch + gray-matter, zero native deps
- ADR-0008: Auto-commit DB (Deprecated) — no longer applicable

## Next Steps
1. Test MCP server end-to-end with Claude Code
2. Build extension VSIX and test bundled MCP server
3. Migrate this project's own memory-bank to v2 format (flat layout, YAML frontmatter)
4. Update instructions and skill for v2 tools/patterns
5. Real-world testing across different projects
