# Active Context

## Current Focus
Consolidating recent work: build hooks, dead code reports, CGC config, docs

## Recent Changes
- Moved build hook from afterEdit/afterWrite to Stop hook (runs once after response ends)
- Added KuzuDB dead code report and updated review verdict with comparison
- Updated .mcp.json: renamed CGC server, added KuzuDB env config
- Added .gitignore and .cgcignore for CodeGraphContext artifacts
- Added debounced-build.sh script for auto-rebuild
- Added docs/mcp-multi-project-tutorial.md

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Centralize duplicated tool helpers into shared-utils.ts
- ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

## Next Steps
1. Consider adding bulk link operations if needed
2. Consider adding memory_list_links tool for direct link querying without graph traversal

