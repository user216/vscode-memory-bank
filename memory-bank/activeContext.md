# Active Context

## Current Focus
Copilot Agent Plugin distribution + npm publish for MCP server

## Recent Changes
- Created user216/memory-bank-plugin GitHub repo as Copilot Agent Plugin
- Added copilot-plugin/ as git submodule in parent repo
- Plugin contains: plugin.json, skills/, agents/, hooks/, prompts/, instructions/, .mcp.json
- Plugin .mcp.json uses npx vscode-memory-bank-mcp@latest for MCP server
- Prepared mcp/package.json for npm publish (added repository, keywords, engines, prepublishOnly)
- Fixed bin path format (removed ./ prefix)
- Created ADR-0013 documenting Agent Plugin distribution decision

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation
- ADR-0009: Centralize duplicated tool helpers into shared-utils.ts
- ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

## Next Steps
1. Run npm adduser && cd mcp && npm publish --access public to publish MCP server to npm
2. Submit memory-bank-plugin to github/copilot-plugins marketplace (PR to add to plugins/)
3. Keep copilot-plugin submodule in sync when skills/agents/hooks change in monorepo
4. Test plugin install via @agentPlugins search in VS Code Insiders

