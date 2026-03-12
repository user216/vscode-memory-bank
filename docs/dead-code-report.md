# Dead Code Analysis Report — vscode-memory-bank

**Date**: March 11, 2026  
**Tool**: CodeGraphContext (CGC) v0.3.0 via MCP  
**Database**: FalkorDB Lite  
**Files indexed**: 36  
**Repo**: `/home/narayanaya/vscode-memory-bank`

---

## Summary

| Category | Count |
|----------|-------|
| Total flagged functions | 50 |
| False positives (framework entry points) | ~35 |
| Potentially real dead code | ~4 |
| Duplicated helpers (refactoring candidates) | ~11 |

---

## 1. False Positives — VS Code Framework Entry Points

These are **not dead code**. They are called by VS Code runtime, not via direct function calls in the codebase.

### Extension Entry Points

| Function | File | Line |
|----------|------|------|
| `activate` | `extension/src/extension.ts` | 14 |
| `deactivate` | `extension/src/extension.ts` | 85 |
| `refreshAll` | `extension/src/extension.ts` | 55 |
| `activate` | `db-viewer/src/extension.ts` | 8 |
| `deactivate` | `db-viewer/src/extension.ts` | 36 |

### VS Code CustomEditor API (DbViewerProvider)

| Function | File | Line |
|----------|------|------|
| `openCustomDocument` | `db-viewer/src/dbViewerProvider.ts` | 74 |
| `resolveCustomEditor` | `db-viewer/src/dbViewerProvider.ts` | 85 |
| `updateCell` | `db-viewer/src/dbViewerProvider.ts` | 132 |
| `saveFile` | `db-viewer/src/dbViewerProvider.ts` | 168 |
| `loadTableData` | `db-viewer/src/dbViewerProvider.ts` | 253 |
| `searchTableData` | `db-viewer/src/dbViewerProvider.ts` | 334 |
| `executeCustomQuery` | `db-viewer/src/dbViewerProvider.ts` | 406 |

### VS Code TreeDataProvider Interface

| Function | File | Line | Class |
|----------|------|------|-------|
| `refresh` | `extension/src/sidebar/decisions-provider.ts` | 13 | `DecisionsTreeProvider` |
| `getTreeItem` | `extension/src/sidebar/decisions-provider.ts` | 17 | `DecisionsTreeProvider` |
| `getChildren` | `extension/src/sidebar/decisions-provider.ts` | 21 | `DecisionsTreeProvider` |
| `refresh` | `extension/src/sidebar/tasks-provider.ts` | 13 | `TasksTreeProvider` |
| `getTreeItem` | `extension/src/sidebar/tasks-provider.ts` | 17 | `TasksTreeProvider` |
| `getChildren` | `extension/src/sidebar/tasks-provider.ts` | 21 | `TasksTreeProvider` |
| `refresh` | `extension/src/sidebar/tree-provider.ts` | 23 | `MemoryBankTreeProvider` |
| `getTreeItem` | `extension/src/sidebar/tree-provider.ts` | 27 | `MemoryBankTreeProvider` |
| `getChildren` | `extension/src/sidebar/tree-provider.ts` | 31 | `MemoryBankTreeProvider` |

### VS Code Command-Registered Methods

| Function | File | Line | Class |
|----------|------|------|-------|
| `toggle` | `extension/src/mcp/server-manager.ts` | 98 | `McpServerManager` |
| `isRunning` | `extension/src/mcp/server-manager.ts` | 102 | `McpServerManager` |
| `createOrShow` | `extension/src/webview/knowledge-graph.ts` | 26 | `KnowledgeGraphPanel` |

---

## 2. Potentially Real Dead Code

These functions are **not** tied to a VS Code API contract and may be genuinely unused:

| Function | File | Line | Notes |
|----------|------|------|-------|
| `syncSingleFile` | `mcp/src/sync.ts` | 64 | May have been replaced by bulk sync |
| `getLinks` | `mcp/src/tools/memory-graph.ts` | 120 | Investigate if still referenced |
| `getOrderedItems` | `mcp/src/tools/memory-recall.ts` | 82 | May be an unused helper |
| `getActivePriority` | `mcp/src/tools/memory-recall.ts` | 122 | May be an unused helper |

**Recommendation**: Verify these manually. If unused, remove them to reduce maintenance burden.

---

## 3. Duplicated Helpers — Refactoring Candidates

### `getMemoryBankPath` — duplicated in 5 files

| File | Line |
|------|------|
| `mcp/src/tools/memory-create-decision.ts` | 7 |
| `mcp/src/tools/memory-create-task.ts` | 10 |
| `mcp/src/tools/memory-import-decisions.ts` | 7 |
| `mcp/src/tools/memory-save-context.ts` | 7 |
| `mcp/src/tools/memory-update-decision.ts` | 8 |

### `slugify` — duplicated in 3 files

| File | Line |
|------|------|
| `mcp/src/tools/memory-create-decision.ts` | 31 |
| `mcp/src/tools/memory-create-task.ts` | 34 |
| `mcp/src/tools/memory-import-decisions.ts` | 31 |

### `updateDecisionIndex` — duplicated in 3 files

| File | Line |
|------|------|
| `mcp/src/tools/memory-create-decision.ts` | 39 |
| `mcp/src/tools/memory-import-decisions.ts` | 39 |
| `mcp/src/tools/memory-update-decision.ts` | 15 |

### `getNextAdrId` — duplicated in 2 files

| File | Line |
|------|------|
| `mcp/src/tools/memory-create-decision.ts` | 14 |
| `mcp/src/tools/memory-import-decisions.ts` | 14 |

### ADR parsing helpers (unique to `memory-import-decisions.ts`)

| Function | Line |
|----------|------|
| `parseFrontMatter` | 90 |
| `extractAdrNumber` | 112 |
| `extractTitle` | 122 |
| `extractStatus` | 140 |
| `collectMarkdownFiles` | 166 |

### ADR parsing helpers (unique to `memory-update-decision.ts`)

| Function | Line |
|----------|------|
| `parseAdr` | 72 |
| `rebuildAdr` | 109 |
| `getNextTaskId` | 17 (in `memory-create-task.ts`) |
| `updateTaskIndex` | 42 (in `memory-create-task.ts`) |

**Recommendation**: Extract shared helpers (`getMemoryBankPath`, `slugify`, `updateDecisionIndex`, `getNextAdrId`) into a common `mcp/src/tools/shared-utils.ts` module.

---

## Methodology

1. **Indexing**: The entire `vscode-memory-bank` repo was indexed using CGC's `add_code_to_graph` MCP tool (36 files, ~31s)
2. **Analysis**: The `find_dead_code` MCP tool was run scoped to `/home/narayanaya/vscode-memory-bank`
3. **Classification**: Results were manually classified into false positives (VS Code API), real dead code, and refactoring candidates
4. **Limitation**: CGC detects functions with no incoming call edges in the graph. It cannot track dynamic dispatch, decorator-registered commands, or interface contract methods — these appear as false positives.
