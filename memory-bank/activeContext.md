# Active Context

## Current Focus
All 7 layers built and fully standards-compliant as a Copilot plugin. Ready for real-world testing.

## Recent Changes
- Added Copilot plugin manifests (`.github/plugin/marketplace.json`, `.claude-plugin/marketplace.json`)
- Added portable MCP config (`.vscode/mcp.json` with `${workspaceFolder}` paths)
- Added standard community files (`CONTRIBUTING.md`, `SECURITY.md`)
- Extension v0.2.0: Knowledge Graph webview, MCP server lifecycle, improved status bar icons
- MCP status bar shows "Memory Bank MCP" with circle icons (checkmark/slash/X for running/stopped/error)
- Updated all instruction files (Layers 0-3) to prioritize MCP tools over raw file reads

## Current Decisions
- No model pinning: agents inherit user's default (ADR-0004)
- No tool restrictions: behavior guided by instructions, not tool blocking
- Quality-first: Claude Opus (latest) recommended, no cost-driven model switching
- Additive compatibility with original memory-bank.instructions.md (ADR-0001)
- Memory bank replaces PRD, ADRs kept for immutable decision history (ADR-0003)

## Next Steps
1. Real-world testing across different projects
