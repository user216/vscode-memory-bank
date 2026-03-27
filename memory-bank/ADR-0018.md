---
type: decision
status: Accepted
created: 2026-03-27
---
# ADR-0018: Bundle MCP Dependencies in VSIX Package

## Context

The extension's build pipeline (`scripts/bundle-mcp.js`) copies the MCP server's compiled output and runs `npm install --production` to bundle pure-JS dependencies (`@modelcontextprotocol/sdk`, `minisearch`, `gray-matter`, etc.) into `extension/mcp-server/node_modules/`.

However, `.vscodeignore` contained the line `mcp-server/node_modules/**`, which stripped these dependencies during VSIX packaging. After installing the extension, the MCP server crashed on startup:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@modelcontextprotocol/sdk'
  imported from .../mcp-server/build/index.js
```

A related issue: `.vscode/mcp.json` contained a hardcoded path with the extension version (e.g. `...-0.3.0/mcp-server/build/index.js`). After upgrading the extension to a new version, this path pointed to a non-existent directory, also causing startup failure.

## Decision

1. **Remove `mcp-server/node_modules/**` from `.vscodeignore`** — MCP server production dependencies must ship inside the VSIX. The extension's own `node_modules/**` exclusion remains (those are dev-only TypeScript/types deps).

2. **Always refresh the MCP server path on activation** — `generateCopilotMcpConfig()` now unconditionally updates `args[0]` in `.vscode/mcp.json` to match the current `extensionPath`, while preserving user-customized `env` settings.

3. **Add build verification tests** — 13 Node.js test runner tests (`extension/test/bundle-verify.test.js`) that verify:
   - `mcp-server/node_modules/` exists with critical packages
   - `.vscodeignore` does not exclude `mcp-server/node_modules`
   - Config generator creates, updates, and preserves configs correctly

## Consequences

- VSIX size increases (~4.8 MB) due to bundled `node_modules` — acceptable for pure-JS deps
- MCP server starts reliably after fresh installs and version upgrades
- Config path is always current — no manual `.vscode/mcp.json` edits needed after upgrades
- Build verification tests catch future `.vscodeignore` regressions
