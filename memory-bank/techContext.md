# Tech Context

## Agent Identity — CRITICAL
**The AI agent in this project is the Claude Agent Preview running inside VS Code via the GitHub Copilot extension's Claude Agent SDK.** It is NOT Claude Code CLI. These are different products:

| | Claude Agent Preview (this project) | Claude Code CLI |
|---|---|---|
| Runtime | VS Code + GitHub Copilot extension | Standalone terminal CLI |
| Billing | GitHub Copilot subscription | Anthropic subscription |
| Slash commands | `/agents`, `/hooks`, `/memory`, `/init`, `/pr-comments`, `/review`, `/security-review` | Different command set |
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

## Tech Stack

### MCP Server (v2.0.0)
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x, compiled with `tsc`
- **Index**: In-memory `Map<string, ParsedItem>` + MiniSearch (7KB, pure JS)
- **Frontmatter**: `gray-matter` (30KB, pure JS) — parses YAML `---` delimited metadata
- **Full-text search**: MiniSearch with BM25 ranking, prefix/fuzzy matching, title boosting
- **Graph**: Adjacency lists (`outgoing`/`incoming` Maps) for relationship traversal
- **File watching**: `chokidar` (via `fs.watch`) for incremental index updates
- **Protocol**: `@modelcontextprotocol/sdk` (stdio transport)
- **Zero native dependencies** — no `better-sqlite3`, no `node-gyp`, no C/C++ compilation

### VS Code Extension (v0.3.1)
- **Language**: TypeScript, bundled with `esbuild`
- **API**: VS Code Extension API
- **MCP server bundled**: Pure JS deps included at build time (no runtime `npm install`)
- **Dual-layout support**: v1 subdirectories + v2 flat layout
- **YAML frontmatter parsing**: Regex-based (no `gray-matter` dep in extension — keeps bundle small)

## VS Code Customization Primitives Used
| Primitive | Location | Format |
|-----------|----------|--------|
| Custom Instructions | `instructions/` | `.instructions.md` (YAML frontmatter + markdown) |
| Agent Skills | `skills/` | `SKILL.md` + resource files in folder |
| Prompt Files | `.github/prompts/` | `.prompt.md` (YAML frontmatter + markdown) |
| Custom Agents | `.github/agents/` | `.agent.md` (YAML frontmatter + markdown) |
| Hooks | `.github/hooks/` | `.json` (hook configuration) |
| MCP Servers | **`.mcp.json`** (project root) | JSON (MCP server configuration) |

## Dependencies
- Original instruction: [github/awesome-copilot/instructions/memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md)
- Research sources: 9 existing memory MCP projects (documented in decisions/ADR-0001)
- CodeGraphContext: [andriispivakelectrodosg/CodeGraphContext](https://github.com/andriispivakelectrodosg/CodeGraphContext) — external end-user MCP tool

## Constraints
- Layers 0-4 must have zero external dependencies (no npm install, no Python, no Docker)
- All memory bank files must be valid markdown
- Must maintain full compatibility with v1 `**Status:** X` metadata format
- MCP server must have zero native dependencies (ADR-0016)
