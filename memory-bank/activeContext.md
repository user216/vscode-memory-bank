# Active Context

## Current Focus
Added memory_create_decision and memory_import_decisions MCP tools, forked DB Viewer Enhanced with FTS5

## Recent Changes
- Added memory_create_decision MCP tool — creates ADR files with auto-generated IDs
- Added memory_import_decisions MCP tool — imports external ADRs or re-syncs existing to SQLite
- Updated memory-schema.ts to list both new tools
- Registered both tools in index.ts
- Created ADR-0007 documenting the decision
- Forked DB Viewer Enhanced with FTS5 WASM support (db-viewer submodule)
- Fixed WITHOUT ROWID table handling in DB Viewer Enhanced

## Current Decisions
- ADR-0007: Add memory_create_decision and memory_import_decisions MCP tools
- Use forked DB Viewer Enhanced with custom FTS5 WASM
- .md files are mandatory primary format, SQLite is secondary

## Next Steps
1. Restart MCP server to activate new tools
2. Verify memory_create_decision and memory_import_decisions work end-to-end
3. Add documentation and examples for MCP tools

