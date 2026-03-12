# Active Context

## Current Focus
Extension auto-setup: zero manual steps after VSIX install (ADR-0012)

## Recent Changes
- Switched extension activation from workspaceContains to onStartupFinished (package.json)
- Added welcome view with [Initialize Memory Bank] button for uninitialized workspaces
- Refactored extension.ts into two-mode activation with initializeFullUI() callback — no reload needed
- Restructured commands/index.ts with mutable Providers and onInit callback
- Created server-bootstrap.ts — auto-runs npm install --production for MCP native deps
- Created config-generator.ts — generates both .mcp.json (Claude Code) and .vscode/mcp.json (GitHub Copilot) with correct absolute paths
- Created scripts/bundle-mcp.js — copies MCP build artifacts into extension at build time
- Updated .vscodeignore to include mcp-server/ but exclude its node_modules/
- Updated server-manager.ts — removed buggy hardcoded template, uses config-generator
- Added build:all pipeline: build:mcp → build:ext → bundle-mcp
- VSIX now 118KB (was 28KB) with bundled MCP server JS
- Created ADR-0012 documenting the decision

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Centralize duplicated tool helpers into shared-utils.ts
- ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

## Next Steps
1. Test VSIX install on macOS to verify npm install --production works for better-sqlite3
2. Bump extension version to 0.3.0 for the auto-setup release
3. Update README to reflect zero-setup experience for Layer 6
4. Consider adding extension update detection to re-run npm install when extensionPath changes

