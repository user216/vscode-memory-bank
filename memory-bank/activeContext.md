# Active Context

## Current Focus
All 7 layers built and fully standards-compliant as a Copilot plugin. MCP server now has 9 tools (6 read + 3 write). PreToolUse hook enforces MCP-first reads. Ready for real-world testing.

## Recent Changes
- Added 3 MCP write tools: `memory_create_task`, `memory_update_status`, `memory_save_context`
- Added PreToolUse hook (`enforce-mcp-reads.sh`) — blocks Read/Grep/Glob on memory-bank/, forces MCP tools
- Hook configured in `.claude/settings.json` (Claude Code) and `hooks/memory-hooks.json` (Copilot)
- MCP server now has 9 tools total (6 read + 3 write)
- Added Copilot plugin manifests and standard community files
- Extension v0.2.0: Knowledge Graph webview, MCP server lifecycle, improved status bar icons

## Current Decisions
- No model pinning: agents inherit user's default (ADR-0004)
- No tool restrictions: behavior guided by instructions, not tool blocking
- Quality-first: Claude Opus (latest) recommended, no cost-driven model switching
- Additive compatibility with original memory-bank.instructions.md (ADR-0001)
- Memory bank replaces PRD, ADRs kept for immutable decision history (ADR-0003)

## Next Steps
1. Real-world testing across different projects
