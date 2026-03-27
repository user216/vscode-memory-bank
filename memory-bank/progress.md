# Progress

## What's Working
- GitHub repository: https://github.com/user216/vscode-memory-bank
- Git submodule linked from 8marta parent project
- **MCP Server v2.0.0**: Pure TypeScript, zero native dependencies
  - In-memory index: `Map<string, ParsedItem>` + MiniSearch + adjacency lists
  - 17 tools: search, query, recall, link, unlink, update-link, graph, schema, create-task, create-decision, create-note, update-status, update-decision, import-decisions, save-context, status, tags
  - YAML frontmatter parsing (gray-matter) + v1 `**Key:** Value` backward compat
  - Wikilink `[[ID]]` and inline `#tag` extraction
  - 99 tests passing across 4 test files
- **VS Code Extension v0.3.1**: Sidebar (Files/Tasks/Decisions/MCP Setup), status bar, Knowledge Graph webview
  - Zero runtime install — pure JS deps bundled at build time
  - Dual-layout support: v1 (`tasks/`, `decisions/`) + v2 (flat `TASK-*.md`, `ADR-*.md`)
  - YAML frontmatter parsing for sidebar status display
  - MCP Setup sidebar: Copilot auto-configured, Claude Code click-to-copy
  - Config generator: only `.vscode/mcp.json`, won't overwrite existing
- **Copilot Agent Plugin v0.4.0**: Skills + agents + hooks + prompts only (no bundled MCP — ADR-0017)
- **Layer 0**: Custom instruction file — MCP-first principle, automatic updates
- **Layer 1**: Agent skill + templates (projectbrief, task, decision)
- **Layer 2**: Prompt files
- **Layer 3**: Custom agents (Memory Planner + Memory Worker)
- **Layer 4**: Hooks (SessionStart, PreCompact, Stop)
- **Layer 5**: MCP server (see above)
- **Layer 6**: VS Code extension (see above)
- **17 ADRs**: 15 accepted, 2 deprecated (ADR-0006, ADR-0008)

## What Remains
- [x] Layer 0-6: All layers built and feature-complete
- [x] MCP Server v2 migration (ADR-0015 + ADR-0016)
- [x] Update instruction and skill files for v2 tools
- [ ] Migrate this project's memory-bank to v2 flat layout
- [ ] End-to-end testing of bundled VSIX in clean environment
- [ ] Real-world testing across different projects

## Known Issues
- Extension needs `npm run build:all` to compile and bundle MCP server before packaging
- v2 flat layout migration tool not yet implemented (manual migration works)

## Overall Status
Phase: v2 fully implemented, testing
Completion: ~97%
