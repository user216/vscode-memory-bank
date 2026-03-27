---
type: note
tags: [technology, stack, configuration]
created: 2026-03-09
updated: 2026-03-27
related: [ADR-0016, ADR-0018]
---
# NOTE-003: Tech Context

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
- **YAML frontmatter parsing**: Regex-based (no `gray-matter` dep in extension)

## VS Code Customization Primitives Used
| Primitive | Location | Format |
|-----------|----------|--------|
| Custom Instructions | `instructions/` | `.instructions.md` (YAML frontmatter + markdown) |
| Agent Skills | `skills/` | `SKILL.md` + resource files in folder |
| Prompt Files | `.github/prompts/` | `.prompt.md` (YAML frontmatter + markdown) |
| Custom Agents | `.github/agents/` | `.agent.md` (YAML frontmatter + markdown) |
| Hooks | `.github/hooks/` | `.json` (hook configuration) |
| MCP Servers | `.vscode/mcp.json` | JSON (MCP server configuration) |

## Dependencies
- Original instruction: [github/awesome-copilot/instructions/memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md)
- CodeGraphContext: external end-user MCP tool ([[ADR-0011]])
