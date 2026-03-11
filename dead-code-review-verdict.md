# Dead Code Report — Review Verdict

**Report reviewed**: `dead-code-report.md` (March 11, 2026)
**Review date**: March 11, 2026
**Score**: 10/14 accurate, 4/14 wrong — all errors in the "dead code" category

| # | Category | Function | File | Report Claim | Verdict |
|---|----------|----------|------|--------------|---------|
| 1 | False Positive | `activate` | `extension/src/extension.ts:14` | VS Code entry point, not dead | Correct |
| 2 | False Positive | `deactivate` | `extension/src/extension.ts:85` | VS Code entry point, not dead | Correct |
| 3 | False Positive | `refreshAll` | `extension/src/extension.ts:55` | Extension entry point | Correct, but it's a file-watcher callback, not an "entry point" |
| 4 | False Positive | `openCustomDocument` | `db-viewer/src/dbViewerProvider.ts:74` | CustomEditor API method | Correct, but class implements `CustomReadonlyEditorProvider` |
| 5 | False Positive | `toggle` | `extension/src/mcp/server-manager.ts:98` | Command-registered method | Correct |
| 6 | False Positive | `createOrShow` | `extension/src/webview/knowledge-graph.ts:26` | Command-registered method | Correct |
| 7 | Dead Code | `syncSingleFile` | `mcp/src/sync.ts:64` | Replaced by bulk sync | **Wrong** — imported and called in 7 production files + 2 test files |
| 8 | Dead Code | `getLinks` | `mcp/src/tools/memory-graph.ts:120` | Possibly unreferenced | **Wrong** — called at line 54 in the same file |
| 9 | Dead Code | `getOrderedItems` | `mcp/src/tools/memory-recall.ts:82` | Unused helper | **Wrong** — called at line 42 in the same file |
| 10 | Dead Code | `getActivePriority` | `mcp/src/tools/memory-recall.ts:122` | Unused helper | **Wrong** — called at lines 110–111 in the same file |
| 11 | Duplication | `getMemoryBankPath` | 5 files claimed | Duplicated in 5 files | **Understated** — actually 6 files (missed `memory-update-status.ts`) |
| 12 | Duplication | `slugify` | 3 files claimed | Duplicated in 3 files | Correct |
| 13 | Duplication | `updateDecisionIndex` | 3 files claimed | Duplicated in 3 files | Correct |
| 14 | Duplication | `getNextAdrId` | 2 files claimed | Duplicated in 2 files | Correct |

## Root Cause of Errors

All 4 wrong findings are in the "dead code" category. The CGC `find_dead_code` tool detects functions with no incoming call edges in the graph. It failed to track:

- **Intra-file calls** to non-exported functions (`getLinks`, `getOrderedItems`, `getActivePriority`)
- **Cross-file imports** for exported functions (`syncSingleFile`)

## Action Taken

The duplication findings (rows 11–14) were addressed in commit `61c16f6`:

- Created `mcp/src/tools/shared-utils.ts` centralizing all shared helpers
- Updated 6 tool files to import from shared module
- Fixed `DecisionStatus` type to include `"Rejected"`
- Fixed `updateIndex` bug: decisions now correctly default to `"Proposed"` status
- Documented in ADR-0009
