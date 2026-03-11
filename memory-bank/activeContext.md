# Active Context

## Current Focus
Integrated CodeGraphContext fork as git submodule with 10 SCIP/dead-code/call-resolution fixes

## Recent Changes
- Added CodeGraphContext fork (andriispivakelectrodosg/CodeGraphContext) as git submodule
- Implemented 10 fixes across 7 files: SCIP fallback, dead code query (File/Class callers), parent context walking (TS/JS anonymous callbacks), .js→.ts import resolution, --scip CLI flag, SCIP indexer scope/kind/env fixes
- Ran dead code analysis on vscode-memory-bank using CGC MCP — produced dead-code-report.md and dead-code-review-verdict.md
- Added .mcp.json with memory-bank MCP server and CodeGraphContext MCP server config
- Previous: shared-utils.ts refactoring to deduplicate MCP tool helpers (ADR-0009)

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Extract shared helpers into shared-utils.ts
- ADR-0010: Integrate CodeGraphContext as submodule for code graph analysis

## Next Steps
1. Set up CodeGraphContext venv in submodule path for MCP server usage
2. Real-world testing of improved dead code detection after CGC fixes
3. Consider extracting MEMORY_BANK_PATH from index.ts to also use shared getMemoryBankPath()

