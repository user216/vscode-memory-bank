---
type: core
title: Progress
created: 2026-03-09
updated: 2026-03-27
tags: [progress, status]
---
# Progress

## What's Working
- GitHub repository: https://github.com/user216/vscode-memory-bank
- **MCP Server v2.0.0**: Pure TypeScript, zero native dependencies
  - In-memory index: `Map<string, ParsedItem>` + MiniSearch + adjacency lists
  - 17 tools: search, query, recall, link, unlink, update-link, graph, schema, create-task, create-decision, create-note, update-status, update-decision, import-decisions, save-context, status, tags
  - YAML frontmatter parsing (gray-matter) + v1 `**Key:** Value` backward compat
  - Wikilink `[[ID]]` and inline `#tag` extraction
  - 99 tests passing across 4 test files
- **VS Code Extension v0.3.1**: Sidebar (Files/Tasks/Decisions/MCP Setup), status bar, Knowledge Graph webview
  - Zero runtime install — pure JS deps bundled at build time
  - Dual-layout: v1 (`tasks/`, `decisions/`) + v2 (flat `TASK-*.md`, `ADR-*.md`)
  - Config generator: always refreshes MCP server path, preserves user env
  - 13 build verification tests
- **Copilot Plugin v0.4.0**: Skills + agents + hooks + prompts only ([[ADR-0017]])
- **Custom Instructions**: MCP-first principle, automatic updates
- **Skills**: managing-memory-bank + building-vscode-agent-plugins
- **Agents**: Memory Planner + Memory Worker
- **Hooks**: SessionStart, PreCompact, Stop
- **18 ADRs**: 16 accepted, 2 deprecated ([[ADR-0006]], [[ADR-0008]])
- **Memory-bank migrated to v2**: Flat layout, YAML frontmatter, wikilinks

## What Remains
- [x] All components built and feature-complete
- [x] MCP Server v2 migration ([[ADR-0015]] + [[ADR-0016]])
- [x] Migrate this project's memory-bank to v2 flat layout
- [ ] End-to-end testing of bundled VSIX in clean environment
- [ ] Real-world testing across different projects ([[TASK-003]])
- [ ] Fix `chat.pluginLocations` path

## Known Issues
- Extension needs `npm run build:all` before packaging
- `chat.pluginLocations` must point to `copilot-plugin/` subdir, not repo root

## Overall Status
Phase: v2 complete, testing
Completion: ~98%
