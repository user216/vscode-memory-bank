# Active Context

## Current Focus
Build hooks refactored — moved MCP auto-rebuild from per-edit to Stop hook

## Recent Changes
- Moved MCP auto-rebuild hook from afterEdit/afterWrite to Stop event (fires once after full response)
- Added debounced-build.sh script for conditional MCP server rebuild
- Updated .claude/settings.json with Stop hook configuration
- CGC MCP config renamed to CodeGraphContext-vmb-mcp with KuzuDB backend and env vars
- Extended dead-code-review-verdict.md with KuzuDB report comparison (67/67 accurate)
- Added dead-code-report-kuzudb.md (KuzuDB backend analysis)
- Added .gitignore and .cgcignore for CodeGraphContext data directory
- Added docs/mcp-multi-project-tutorial.md for CGC multi-project setup

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Extract shared tool helpers into shared-utils.ts
- ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

## Next Steps
1. Consider adding bulk link operations if needed
2. Consider adding memory_list_links tool for direct link querying without graph traversal
3. Run dead code analysis with improved CGC on future code changes

