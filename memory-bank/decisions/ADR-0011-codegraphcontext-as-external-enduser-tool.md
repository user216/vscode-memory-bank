# ADR-0011: Use CodeGraphContext as external end-user tool, develop separately

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:**
**Supersedes:** ADR-0010

## Context
ADR-0010 integrated the CodeGraphContext fork as a git submodule in vscode-memory-bank for both development and end-user usage. However, CGC development (Python, tree-sitter, SCIP) is orthogonal to vscode-memory-bank development (TypeScript, VS Code extension, MCP). Mixing both in one workspace adds clutter, and CGC deserves its own VS Code profile with language-specific settings.

## Decision
- Remove the CodeGraphContext git submodule from vscode-memory-bank
- Clone the CGC fork to `/home/narayanaya/CodeGraphContext` as a standalone repo, managed in a separate VS Code profile
- Keep CGC as an end-user MCP tool in `.mcp.json` (pointing to the external install)
- Keep dead code analysis reports (`dead-code-report.md`, `dead-code-review-verdict.md`) in vscode-memory-bank as they document this project's code quality

## Consequences
- Cleaner workspace: vscode-memory-bank contains only its own project code
- CGC development happens independently with its own VS Code profile
- `.mcp.json` still provides CGC MCP tools (dead code analysis, code graph queries) for end-user usage
- Must set up CGC venv at `/home/narayanaya/CodeGraphContext/.venv` for the MCP server to work
