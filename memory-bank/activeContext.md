# Active Context

## Current Focus
Completed shared-utils.ts refactoring to deduplicate MCP tool helpers

## Recent Changes
- Created mcp/src/tools/shared-utils.ts — centralizes getMemoryBankPath, slugify, getNextId, updateDecisionIndex, updateTaskIndex, and status constants
- Updated 6 tool files to import from shared-utils instead of defining locally
- Fixed DecisionStatus type in types.ts to include 'Rejected'
- Fixed updateIndex bug in memory-update-status.ts — decisions now correctly default to 'Proposed' status
- Removed dead VALID_STATUSES constant and unused getDb import from memory-create-task.ts

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation

## Next Steps
1. Consider extracting MEMORY_BANK_PATH from index.ts to also use shared getMemoryBankPath()
2. Monitor for any further duplication patterns as new tools are added

