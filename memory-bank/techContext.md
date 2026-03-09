# Tech Context

## Target Platform
- **IDE**: VS Code (1.106+)
- **AI Extension**: GitHub Copilot with agent mode
- **AI Model**: Claude (via Claude Agent SDK)
- **OS**: Linux (primary), macOS, Windows

## VS Code Customization Primitives Used
| Primitive | Location | Format |
|-----------|----------|--------|
| Custom Instructions | `.github/instructions/` | `.instructions.md` (YAML frontmatter + markdown) |
| Agent Skills | `.github/skills/` | `SKILL.md` + resource files in folder |
| Prompt Files | `.github/prompts/` | `.prompt.md` (YAML frontmatter + markdown) |
| Custom Agents | `.github/agents/` | `.agent.md` (YAML frontmatter + markdown) |
| Hooks | `.github/hooks/` | `.json` (hook configuration) |
| MCP Servers | `.vscode/mcp.json` | JSON (MCP server configuration) |

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
