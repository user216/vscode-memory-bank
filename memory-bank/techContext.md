# Tech Context

## Agent Identity — CRITICAL
**The AI agent in this project is the Claude Agent Preview running inside VS Code via the GitHub Copilot extension's Claude Agent SDK.** It is NOT Claude Code CLI. These are different products:

| | Claude Agent Preview (this project) | Claude Code CLI |
|---|---|---|
| Runtime | VS Code + GitHub Copilot extension | Standalone terminal CLI |
| Billing | GitHub Copilot subscription | Anthropic subscription |
| Slash commands | `/agents`, `/hooks`, `/memory`, `/init` | Different command set |
| Documentation | [VS Code Claude Agent Preview](https://code.visualstudio.com/docs/copilot/agents/third-party-agents#_claude-agent-preview) | [code.claude.com](https://code.claude.com) |

**Never refer to yourself as Claude Code. You are the Claude Agent running inside VS Code Copilot.**

## MCP Configuration — CRITICAL
**The Claude Agent SDK in VS Code reads MCP servers from `.mcp.json` at the project root.** NOT from `.vscode/mcp.json`. This has been verified through practical testing.

| File | Path | Used by Claude Agent SDK? |
|------|------|--------------------------|
| **`.mcp.json`** | `<project-root>/.mcp.json` | **YES — this is the correct config** |
| `.vscode/mcp.json` | `<project-root>/.vscode/mcp.json` | **NO — not read by the agent** |
| `.claude/settings.json` | `<project-root>/.claude/settings.json` | Claude Code CLI only |

## Target Platform
- **IDE**: VS Code (1.106+)
- **AI Extension**: GitHub Copilot extension with Claude Agent SDK (agent mode)
- **AI Models**: Claude Opus (latest) — quality-first, version managed via `memory-bank-config.json`
- **OS**: Linux (primary), macOS, Windows

## VS Code Customization Primitives Used
| Primitive | Location | Format |
|-----------|----------|--------|
| Custom Instructions | `.github/instructions/` | `.instructions.md` (YAML frontmatter + markdown) |
| Agent Skills | `.github/skills/` | `SKILL.md` + resource files in folder |
| Prompt Files | `.github/prompts/` | `.prompt.md` (YAML frontmatter + markdown) |
| Custom Agents | `.github/agents/` | `.agent.md` (YAML frontmatter + markdown) |
| Hooks | `.github/hooks/` | `.json` (hook configuration) |
| MCP Servers | **`.mcp.json`** (project root) | JSON (MCP server configuration) |

## Key Technologies (planned)
- **Layers 0-4**: Pure markdown, YAML, JSON, shell scripts — no compiled code
- **Layer 5 (MCP)**: TypeScript, SQLite + FTS5, optionally local ONNX embeddings
- **Layer 6 (Extension)**: TypeScript, VS Code Extension API

## Development Tools
- Git + GitHub (source control, submodules)
- gh CLI (GitHub operations)
- Node.js / npm (for MCP server and extension layers)

## Constraints
- Layers 0-4 must have zero external dependencies (no npm install, no Python, no Docker)
- All memory bank files must be valid markdown
- Must maintain full compatibility with the original memory-bank.instructions.md
- Hook scripts must work on Linux, macOS, and Windows (with OS-specific overrides)

## Dependencies
- Original instruction: [github/awesome-copilot/instructions/memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md)
- Research sources: 9 existing memory MCP projects (documented in decisions/ADR-0001)
