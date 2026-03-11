# Dead Code Report — vscode-memory-bank (KuzuDB, Isolated DB)

**Generated:** 2026-03-11  
**Tool:** CodeGraphContext fork (KuzuDB backend, project-separated)  
**Indexed:** 39 files, 124 functions, 11 classes  
**Potentially unused:** 67 functions

> **Note:** CGC uses static call-graph analysis. It cannot trace dynamic invocations (VS Code extension API, MCP tool registrations, test framework hooks). Most items below are **false positives** — framework entry points called by the runtime, not by other functions in the codebase.

## db-viewer/src

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `constructor` | dbViewerProvider.ts | 10 | False positive — class constructor |
| `dispose` | dbViewerProvider.ts | 15 | False positive — VS Code Disposable interface |
| `register` | dbViewerProvider.ts | 23 | False positive — called by VS Code extension API |
| `constructor` | dbViewerProvider.ts | 40 | False positive — class constructor |
| `openCustomDocument` | dbViewerProvider.ts | 74 | False positive — VS Code CustomEditorProvider |
| `resolveCustomEditor` | dbViewerProvider.ts | 85 | False positive — VS Code CustomEditorProvider |
| `activate` | extension.ts | 8 | False positive — VS Code extension entry point |
| `deactivate` | extension.ts | 36 | False positive — VS Code extension entry point |

## extension/src

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `registerCommands` | index.ts | 19 | False positive — called from activate() |
| `activate` | extension.ts | 14 | False positive — VS Code extension entry point |
| `refreshAll` | extension.ts | 55 | False positive — called from activate() |
| `deactivate` | extension.ts | 85 | False positive — VS Code extension entry point |
| `ensureGitConfig` | install-git-hook.ts | 42 | **Review** — check if called |
| `installGitHook` | install-git-hook.ts | 74 | **Review** — check if called |

## extension/src/mcp

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `constructor` | server-manager.ts | 17 | False positive — class constructor |
| `toggle` | server-manager.ts | 98 | False positive — called from command registration |
| `isRunning` | server-manager.ts | 102 | False positive — property/getter |

## extension/src/sidebar

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `constructor` | decisions-provider.ts | 11 | False positive — class constructor |
| `refresh` | decisions-provider.ts | 13 | False positive — TreeDataProvider |
| `getTreeItem` | decisions-provider.ts | 17 | False positive — TreeDataProvider |
| `getChildren` | decisions-provider.ts | 21 | False positive — TreeDataProvider |
| `constructor` | decisions-provider.ts | 52 | False positive — class constructor |
| `constructor` | tasks-provider.ts | 11 | False positive — class constructor |
| `refresh` | tasks-provider.ts | 13 | False positive — TreeDataProvider |
| `getTreeItem` | tasks-provider.ts | 17 | False positive — TreeDataProvider |
| `getChildren` | tasks-provider.ts | 21 | False positive — TreeDataProvider |
| `constructor` | tasks-provider.ts | 52 | False positive — class constructor |
| `constructor` | tree-provider.ts | 21 | False positive — class constructor |
| `refresh` | tree-provider.ts | 23 | False positive — TreeDataProvider |
| `getTreeItem` | tree-provider.ts | 27 | False positive — TreeDataProvider |
| `getChildren` | tree-provider.ts | 31 | False positive — TreeDataProvider |
| `constructor` | tree-provider.ts | 52 | False positive — class constructor |

## extension/src/statusbar

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `constructor` | status-bar.ts | 7 | False positive — class constructor |

## extension/src/webview

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `createOrShow` | knowledge-graph.ts | 26 | False positive — called from command registration |
| `constructor` | knowledge-graph.ts | 55 | False positive — class constructor |

## mcp/src

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `getDb` | db.ts | 62 | False positive — exported, used by tools |
| `initDb` | db.ts | 69 | False positive — exported, used by server init |
| `closeDb` | db.ts | 89 | False positive — exported, used by server shutdown |
| `parseMarkdownFile` | parser.ts | 92 | False positive — exported, used by sync |
| `isIndexFile` | parser.ts | 125 | False positive — exported, used by sync |
| `syncAllFiles` | sync.ts | 7 | False positive — exported, called from server |
| `watchMemoryBank` | sync.ts | 201 | False positive — exported, called from server |

## mcp/src/tools

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `registerMemoryCreateDecision` | memory-create-decision.ts | 8 | False positive — MCP tool registration |
| `registerMemoryCreateTask` | memory-create-task.ts | 8 | False positive — MCP tool registration |
| `registerMemoryGraph` | memory-graph.ts | 18 | False positive — MCP tool registration |
| `registerMemoryImportDecisions` | memory-import-decisions.ts | 100 | False positive — MCP tool registration |
| `registerMemoryLink` | memory-link.ts | 5 | False positive — MCP tool registration |
| `registerMemoryQuery` | memory-query.ts | 6 | False positive — MCP tool registration |
| `registerMemoryRecall` | memory-recall.ts | 27 | False positive — MCP tool registration |
| `registerMemorySaveContext` | memory-save-context.ts | 8 | False positive — MCP tool registration |
| `registerMemorySchema` | memory-schema.ts | 14 | False positive — MCP tool registration |
| `registerMemorySearch` | memory-search.ts | 6 | False positive — MCP tool registration |
| `registerMemoryUnlink` | memory-unlink.ts | 5 | False positive — MCP tool registration |
| `registerMemoryUpdateDecision` | memory-update-decision.ts | 80 | False positive — MCP tool registration |
| `registerMemoryUpdateLink` | memory-update-link.ts | 5 | False positive — MCP tool registration |
| `registerMemoryUpdateStatus` | memory-update-status.ts | 11 | False positive — MCP tool registration |
| `getMemoryBankPath` | shared-utils.ts | 7 | False positive — shared utility |
| `slugify` | shared-utils.ts | 14 | False positive — shared utility |
| `getNextId` | shared-utils.ts | 22 | False positive — shared utility |
| `updateDecisionIndex` | shared-utils.ts | 118 | False positive — shared utility |
| `updateTaskIndex` | shared-utils.ts | 122 | False positive — shared utility |

## mcp/test

| Function | File | Line | Verdict |
|----------|------|------|---------|
| `copyFixtures` | db-sync.test.ts | 18 | **Review** — test helper, verify usage |
| `cleanup` | db-sync.test.ts | 24 | **Review** — test helper, verify usage |
| `cleanup` | tools.test.ts | 25 | **Review** — test helper, verify usage |
| `getActivePriority` | tools.test.ts | 200 | **Review** — test helper, possibly unused |
| `cleanupTemp` | write-tools.test.ts | 33 | **Review** — test helper, verify usage |
| `normalizeStatus` | write-tools.test.ts | 661 | **Review** — test helper, possibly unused |

## Summary

| Category | Count | Action |
|----------|-------|--------|
| False positives (framework/API) | 59 | No action needed |
| **Needs review** | **8** | Verify if actually called |

### Items to review

1. `ensureGitConfig` — extension/src/hooks/install-git-hook.ts:42
2. `installGitHook` — extension/src/hooks/install-git-hook.ts:74
3. `copyFixtures` — mcp/test/db-sync.test.ts:18
4. `cleanup` — mcp/test/db-sync.test.ts:24
5. `cleanup` — mcp/test/tools.test.ts:25
6. `getActivePriority` — mcp/test/tools.test.ts:200
7. `cleanupTemp` — mcp/test/write-tools.test.ts:33
8. `normalizeStatus` — mcp/test/write-tools.test.ts:661

## CGC Bugs Encountered

1. **`pre_scan_typescript()` returns `None`** — causes `'NoneType' object is not iterable` in `_pre_scan_for_imports` (line 220 of graph_builder.py). Indexing still works but cross-file call resolution is degraded.
2. **`find_dead_code()` uses `ALL()` with empty list** — KuzuDB cannot resolve the type, throws `RuntimeError: Trying to create a vector with ANY type`. Workaround: run the query manually without the `ALL()` clause.
