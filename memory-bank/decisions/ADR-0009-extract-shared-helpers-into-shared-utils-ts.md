# ADR-0009: Extract shared helpers into shared-utils.ts

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:** 

## Context
Dead-code analysis (CGC tool) identified 15 duplicated function definitions across 6 MCP tool files: `getMemoryBankPath` (6 copies), `slugify` (3 copies), `updateDecisionIndex` (3 copies), `getNextAdrId` (2 copies), plus structural analogs `getNextTaskId` and `updateTaskIndex`. No shared utility module existed. Additionally, `memory-update-status.ts` had a buggy generalized `updateIndex` that defaulted decisions to "Pending" instead of "Proposed" and silently changed index formatting.

## Decision
Created `mcp/src/tools/shared-utils.ts` centralizing all duplicated helpers. Functions are parameterized where structurally analogous: `getNextId(dir, prefix, padding)` replaces both `getNextAdrId` and `getNextTaskId`; a config-driven `updateIndex(dir, config)` with `IndexConfig` interface replaces three different index updater implementations. Convenience wrappers `updateDecisionIndex()` and `updateTaskIndex()` preserve the existing call-site API. Status constants `TASK_STATUSES` and `DECISION_STATUSES` are exported as `as const` tuples. Also fixed `DecisionStatus` type to include "Rejected".

## Alternatives Considered

### Keep duplicates, no refactoring
Lower risk of regressions but increases maintenance burden as any bug fix must be applied to 6+ locations independently.

### Full DRY with index.ts changes
Also replace the inline MEMORY_BANK_PATH in index.ts. Deferred as low-value — it's a single-line module-level constant outside the tools/ directory.

## Consequences
- Reduced from 15 duplicated function definitions to 1 shared module
- Bug fix: decision index now consistently uses 'Proposed' as default status and shows empty groups with _None_ placeholders regardless of which tool updates it
- Future helpers can be added to shared-utils.ts instead of copy-pasting
- All 100 existing tests pass with no behavioral changes for callers

