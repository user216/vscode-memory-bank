# Active Context

## Current Focus
Moved CodeGraphContext development to separate VS Code profile; kept as end-user MCP tool

## Recent Changes
- Removed CodeGraphContext git submodule from workspace (ADR-0010 superseded by ADR-0011)
- CGC fork cloned to /home/narayanaya/CodeGraphContext for development in separate VS Code profile
- Updated .mcp.json to point CGC MCP server to external install path
- Dead code reports (dead-code-report.md, dead-code-review-verdict.md) remain in workspace
- Previous: shared-utils.ts refactoring (ADR-0009), CGC SCIP fixes

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Extract shared helpers into shared-utils.ts
- ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

## Next Steps
1. Set up CGC venv at /home/narayanaya/CodeGraphContext for MCP server usage
2. Run dead code analysis with improved CGC
3. Consider extracting MEMORY_BANK_PATH from index.ts to also use shared getMemoryBankPath()

