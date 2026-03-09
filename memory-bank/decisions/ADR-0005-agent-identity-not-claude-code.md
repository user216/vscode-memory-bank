# ADR-0005: Agent Identity is Claude Agent Preview, Not Claude Code CLI

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
During development, the AI agent repeatedly misidentified itself as "Claude Code" (Anthropic's standalone CLI tool) and referenced Claude Code documentation, settings files, and behaviors. This caused incorrect advice about config file locations, wrong tool references, and confusion about the runtime environment.

The actual runtime is the **Claude Agent Preview** running inside VS Code via the GitHub Copilot extension's Claude Agent SDK. This is a fundamentally different product from Claude Code CLI.

## Decision
Enforce strict agent identity at the instruction level (Layer 0). The agent must never identify as Claude Code CLI. Key differences are documented in `techContext.md` and at the top of `instructions/memory-bank.instructions.md`.

| | Claude Agent Preview (this project) | Claude Code CLI |
|---|---|---|
| Runtime | VS Code + GitHub Copilot extension | Standalone terminal CLI |
| Billing | GitHub Copilot subscription | Anthropic subscription |
| MCP config | `.mcp.json` at project root | `.mcp.json` or other locations |
| Settings | VS Code settings | `.claude/settings.json` |
| Documentation | [VS Code docs](https://code.visualstudio.com/docs/copilot/agents/third-party-agents#_claude-agent-preview) | [code.claude.com](https://code.claude.com) |

## Consequences
- Identity enforcement rules added to Layer 0 instructions (loaded every session)
- `techContext.md` documents the distinction with comparison tables
- Prevents future misidentification and incorrect advice
- All project documentation, instructions, and agents should reference VS Code Copilot context, not Claude Code CLI
