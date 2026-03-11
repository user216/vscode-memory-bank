# ADR-0010: Integrate CodeGraphContext as submodule for code graph analysis

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:**

## Context
Dead code analysis on the vscode-memory-bank codebase revealed significant false positives due to limitations in CodeGraphContext (CGC) v0.3.0: the dead code Cypher query only checked `(caller:Function)-[:CALLS]->` edges (missing File and Class callers), and tree-sitter's `_get_parent_context()` returned `None` for calls inside anonymous callbacks, creating incorrect File→CALLS edges. Additionally, SCIP integration was fragile (crashes on fallback, incorrect scope resolution, wrong symbol kind classification).

## Decision
Forked CodeGraphContext to `andriispivakelectrodosg/CodeGraphContext` and implemented 10 fixes across 7 files:
1. Dead code query expanded to check File/Class callers (system.py)
2. Parent context walking continues past anonymous arrows/functions (typescript.py, javascript.py)
3. SCIP fallback returns sentinel instead of crashing (graph_builder.py)
4. SCIP indexer scope, symbol kind, and env var fixes (scip_indexer.py)
5. TypeScript .js→.ts import resolution (graph_builder.py)
6. SCIP CALLS debug logging (graph_builder.py)
7. `--scip` CLI flag for opt-in SCIP indexing (main.py)
8. SCIP optional dependency group (pyproject.toml)

The fork is integrated as a git submodule at `CodeGraphContext/` in the workspace root. MCP server config in `.mcp.json` points to the submodule's venv.

## Alternatives Considered

### Upstream PR to CodeGraphContext/CodeGraphContext
Could contribute fixes upstream, but the fork allows immediate use and independent iteration. Upstream PR can be opened later.

### Vendor the fixes as patches
More fragile, harder to maintain, and loses git history of the changes.

## Consequences
- Dead code detection accuracy improved (eliminates false positives from anonymous callback calls and File/Class caller edges)
- SCIP indexing is now opt-in and gracefully falls back to tree-sitter on failure
- Submodule adds a dependency on the fork repo — must keep in sync if upstream changes
- .mcp.json now configures two MCP servers: memory-bank and CodeGraphContext
