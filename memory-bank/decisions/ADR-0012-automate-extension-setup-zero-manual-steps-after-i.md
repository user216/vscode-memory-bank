# ADR-0012: Automate extension setup — zero manual steps after install

**Status:** Accepted
**Date:** 2026-03-12
**Deciders:** 

## Context
A macOS user installed the VSIX and got nothing — no sidebar icon, no status bar, no MCP config. The extension required: (1) a pre-existing memory-bank/projectbrief.md to activate, (2) manual CLI steps to build the MCP server, (3) manual .mcp.json creation with correct absolute paths. This defeated the purpose of a VS Code extension.

## Decision
Switch to onStartupFinished activation with a two-mode pattern: show a welcome view with [Initialize Memory Bank] button on uninitialized workspaces, full UI on initialized ones. Bundle the compiled MCP server inside the VSIX (build/ + package.json), run npm install --production automatically at runtime for native deps (better-sqlite3). Auto-generate both .mcp.json (Claude Code) and .vscode/mcp.json (GitHub Copilot) with correct absolute paths resolved from context.extensionPath.

## Alternatives Considered

### Keep manual setup with better docs
Would not fix the UX problem — users expect extensions to just work after install.

### Bundle node_modules in VSIX (pre-built native binaries)
better-sqlite3 is platform-specific (~2MB .node binary). Would require separate VSIX per platform or multi-platform bundling. npm install at runtime with prebuild-install handles this automatically.

### Publish MCP server as separate npm package
Adds another install step. Defeats the goal of zero manual setup.

## Consequences
- Extension activates on every workspace (onStartupFinished) — lightweight but no longer lazy
- First activation runs npm install --production (~10s) for native better-sqlite3 binary
- VSIX grows from ~28KB to ~118KB (MCP server JS + package files, no node_modules)
- MCP config paths auto-update when extension version changes
- Both Claude Code and GitHub Copilot get correct MCP configs automatically

