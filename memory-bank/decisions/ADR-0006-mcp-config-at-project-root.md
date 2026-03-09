# ADR-0006: MCP Config Location is .mcp.json at Project Root

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
The VS Code ecosystem has multiple possible locations for MCP server configuration:
- `.mcp.json` at project root
- `.vscode/mcp.json`
- `.claude/settings.json` (Claude Code CLI only)

The agent repeatedly gave incorrect advice about which file the Claude Agent SDK reads, at one point even deleting the correct config file and keeping the wrong one.

## Decision
**The Claude Agent SDK in VS Code reads MCP servers exclusively from `.mcp.json` at the project root.** This was verified through practical testing by the project maintainer.

- `.vscode/mcp.json` is NOT read by the Claude Agent SDK
- `.claude/settings.json` is for Claude Code CLI only
- `.mcp.json` is not committed to git (contains absolute paths specific to each machine)

## Alternatives Considered

### Use .vscode/mcp.json
Per VS Code documentation, `.vscode/mcp.json` is the standard MCP config location for VS Code extensions.
- **Rejected because:** Practical testing confirmed the Claude Agent SDK does not read this file.

### Use both files
Keep both `.mcp.json` and `.vscode/mcp.json` for compatibility.
- **Rejected because:** Causes duplicate MCP server instances in the MCP server list, confusing users.

## Consequences
- `.mcp.json` at project root is the single source of truth for MCP server configuration
- `.vscode/mcp.json` has been removed from the repository
- This finding is documented in `techContext.md` with a comparison table
- Instructions (Layer 0) enforce this at the top level
- Each user creates their own `.mcp.json` with machine-specific absolute paths (not committed to git)
