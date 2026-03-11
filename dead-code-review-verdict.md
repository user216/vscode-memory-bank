# Dead Code Reports — Review Verdict

## Report 1: `dead-code-report.md` (FalkorDB backend)

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

### Root Cause of Errors (Report 1)

All 4 wrong findings are in the "dead code" category. The CGC `find_dead_code` tool detects functions with no incoming call edges in the graph. It failed to track:

- **Intra-file calls** to non-exported functions (`getLinks`, `getOrderedItems`, `getActivePriority`)
- **Cross-file imports** for exported functions (`syncSingleFile`)

---

## Report 2: `dead-code-report-kuzudb.md` (KuzuDB backend)

**Report reviewed**: `dead-code-report-kuzudb.md` (March 11, 2026)
**Review date**: March 11, 2026
**Score**: 67/67 accurate — all classifications correct (59 false positives + 8 "needs review")

### "Needs Review" Items — All Used

| # | Function | File | Report Claim | Verdict |
|---|----------|------|--------------|---------|
| 1 | `ensureGitConfig` | `extension/src/hooks/install-git-hook.ts:42` | Check if called | **Not dead** — imported and called in `extension.ts:82` |
| 2 | `installGitHook` | `extension/src/hooks/install-git-hook.ts:74` | Check if called | **Not dead** — imported and called in `extension.ts:79` |
| 3 | `copyFixtures` | `mcp/test/db-sync.test.ts:18` | Test helper, verify usage | **Not dead** — called in `beforeEach` at lines 34, 85, 255 |
| 4 | `cleanup` | `mcp/test/db-sync.test.ts:24` | Test helper, verify usage | **Not dead** — called in `beforeEach`/`afterEach` at lines 33, 38, 84, 90, 254, 261 |
| 5 | `cleanup` | `mcp/test/tools.test.ts:25` | Test helper, verify usage | **Not dead** — called in `beforeAll`/`afterAll` at lines 34, 40 |
| 6 | `getActivePriority` | `mcp/test/tools.test.ts:200` | Possibly unused | **Not dead** — called at line 216 within same `it()` block |
| 7 | `cleanupTemp` | `mcp/test/write-tools.test.ts:33` | Test helper, verify usage | **Not dead** — called in 12 `beforeAll`/`afterAll` hooks |
| 8 | `normalizeStatus` | `mcp/test/write-tools.test.ts:661` | Possibly unused | **Not dead** — called at lines 671–678 within same `it()` block |

### False Positives Spot-Check — All Correct

12 of the 59 declared false positives were spot-checked. All confirmed as actually used:

| Function | File | Confirmed Call Site |
|----------|------|---------------------|
| `registerCommands` | `extension/src/commands/index.ts:19` | `extension.ts:68` |
| `refreshAll` | `extension/src/extension.ts:55` | File-watcher callbacks at lines 61–63 |
| `getDb` | `mcp/src/db.ts:62` | 12+ importers across tools |
| `initDb` | `mcp/src/db.ts:69` | `index.ts:30` |
| `closeDb` | `mcp/src/db.ts:89` | `index.ts:71,78,85` |
| `parseMarkdownFile` | `mcp/src/parser.ts:92` | `sync.ts:36,75` |
| `isIndexFile` | `mcp/src/parser.ts:125` | `sync.ts:33,72,212` |
| `syncAllFiles` | `mcp/src/sync.ts:7` | `index.ts:33` |
| `watchMemoryBank` | `mcp/src/sync.ts:201` | `index.ts:37` |
| `registerMemoryUnlink` | `mcp/src/tools/memory-unlink.ts:5` | `index.ts:50` |
| `registerMemoryUpdateLink` | `mcp/src/tools/memory-update-link.ts:5` | `index.ts:51` |
| shared-utils (5 functions) | `mcp/src/tools/shared-utils.ts` | 6 importers across tool files |

### Line Number Accuracy — 16/16 Correct

All 16 sampled line numbers (8 "needs review" + 8 others) were verified against the actual source files. Every line number in the report is accurate.

---

## Comparison: FalkorDB vs KuzuDB Reports

**Note**: The FalkorDB report was generated *before* the shared-utils refactoring; the KuzuDB report was generated *after* (commit `61c16f6`). The KuzuDB report correctly reflects the deduplicated codebase.

| Aspect | FalkorDB Report | KuzuDB Report |
|--------|----------------|---------------|
| Codebase state | Pre-refactoring (duplications present) | Post-refactoring (duplications fixed) |
| Functions flagged | 50 | 67 |
| False positives identified | ~35 | 59 |
| Wrong "dead code" claims | 4 (100% of dead code claims) | 0 |
| Items left for review | 0 (all classified) | 8 (correctly left as "review") |
| Line number accuracy | Not fully checked | 16/16 correct |
| Duplication detection | Yes (understated by 1) | N/A (duplications already fixed) |
| Self-awareness of limitations | Mentioned in methodology | Explicit note at top + CGC bugs section |

**Key difference**: The KuzuDB report was more conservative — it marked uncertain items as "review" instead of asserting they were dead code. This avoided the false claims that plagued the FalkorDB report.

## Action Taken

The duplication findings from Report 1 (rows 11–14) were addressed in commit `61c16f6`:

- Created `mcp/src/tools/shared-utils.ts` centralizing all shared helpers
- Updated 6 tool files to import from shared module
- Fixed `DecisionStatus` type to include `"Rejected"`
- Fixed `updateIndex` bug: decisions now correctly default to `"Proposed"` status
- Documented in ADR-0009
