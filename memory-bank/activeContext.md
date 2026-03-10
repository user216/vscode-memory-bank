# Active Context

## Current Focus
Extension v0.2.1 released — MCP status bar fixed, automatic memory bank update rules added

## Recent Changes
- Fixed MCP status bar button — removed broken child_process.spawn server toggle, now shows .mcp.json config status and opens config on click
- Added automatic ADR/task/context creation rules to Layer 0 instructions (mandatory, don't wait for user)
- Bumped extension to v0.2.1, packed and installed
- Fixed incomplete Claude Agent slash commands list in techContext.md — now lists all 7 commands

## Current Decisions
- ADR-0005: Agent is Claude Agent Preview in VS Code Copilot, NOT Claude Code CLI
- ADR-0006: MCP config is at .mcp.json (project root), not .vscode/mcp.json
- MCP status bar is informational only — SDK manages server lifecycle
- Memory bank updates (ADRs, tasks, context) are mandatory and automatic per Layer 0 instructions

## Next Steps
1. TASK-003: Real-world testing across different projects
2. Consider whether extension version should be further bumped to 0.3.0 for next feature release
3. Verify MCP status bar behavior after VS Code reload

