# ADR-0007: Add memory_create_decision and memory_import_decisions MCP tools

**Status:** Accepted
**Date:** 2026-03-10
**Deciders:** user216

## Context
The MCP server had `memory_create_task` but no equivalent for decisions (ADRs). ADR files had to be created manually. Additionally, projects with existing ADR files had no way to bulk-import them into the memory bank or re-sync them to SQLite after manual edits.

## Decision
Add two new MCP tools:
- `memory_create_decision` — creates ADR files with auto-generated IDs (ADR-NNNN), proper formatting, and index updates
- `memory_import_decisions` — imports external ADR files from any directory (assigns new IDs) or re-syncs existing decisions from `memory-bank/decisions/` to SQLite

Both follow the established pattern: `.md` files are the mandatory primary format (source of truth), SQLite is secondary for search/query.

## Alternatives Considered

### Manual ADR creation only
Continue requiring manual creation of ADR files.
- **Rejected because:** Error-prone, inconsistent formatting, and asymmetric with `memory_create_task` which already exists.

### Database-first approach
Store ADRs primarily in SQLite with markdown as an export format.
- **Rejected because:** `.md` files must be the mandatory primary format. Database is secondary for search.

## Consequences
- MCP server now has 12 tools (was 10)
- ADR creation follows same pattern as task creation — .md first, SQLite second
- Existing projects can bulk-import ADR files from any directory
- Re-sync mode allows recovering from manual edits or DB corruption
