# Active Context

## Current Focus
Layers 0-4 are built and documented. The project is ready for real-world testing. Next work would be Layer 5 (MCP server) or starting to use the toolkit in actual projects.

## Recent Changes
- Removed model version pinning from agent files — agents inherit user's VS Code default (ADR-0004)
- Removed tool restrictions from prompts — all prompts use all available tools
- Broadened Memory Worker tool set, removed tool restrictions from Memory Planner
- Added `memory-bank-config.json` as documentation-only model recommendation
- Added `scripts/update-model.sh` for optional model version pinning
- Created full documentation for all 7 layers (docs/layers/layer-0 through layer-6)
- Created architecture overview (docs/architecture.md)
- All files scoped to VS Code + GitHub Copilot extension + Claude Agent SDK exclusively

## Current Decisions
- No model pinning: agents inherit user's default (ADR-0004)
- No tool restrictions: behavior guided by instructions, not tool blocking
- Quality-first: Claude Opus (latest) recommended, no cost-driven model switching
- Additive compatibility with original memory-bank.instructions.md (ADR-0001)
- Memory bank replaces PRD, ADRs kept for immutable decision history (ADR-0003)

## Next Steps
1. Test Layers 0-4 in a real project (use this toolkit's own development as the test)
2. Decide whether to start Layer 5 (MCP server) or refine Layers 0-4 based on usage
3. Consider adding more hook events (PostToolUse, UserPromptSubmit) based on real usage patterns
4. Evaluate whether the Planner/Worker split adds value in practice vs single agent
