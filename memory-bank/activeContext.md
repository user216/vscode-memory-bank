# Active Context

## Current Focus
All 7 layers are built. Layer 6 VS Code extension is feature-complete with sidebar, status bar, Knowledge Graph webview, and embedded MCP server lifecycle. Ready for real-world testing.

## Recent Changes
- Built Knowledge Graph webview (`extension/src/webview/knowledge-graph.ts`):
  - Interactive force-directed graph visualization (Canvas 2D, no external dependencies)
  - Scans core files, tasks, and decisions; extracts cross-references via `TASK-\d+|ADR-\d{4}` regex
  - Drag support, hover tooltips, double-click to open files in editor
  - Color-coded nodes: blue (core), green (task), yellow (decision)
- Built MCP server lifecycle manager (`extension/src/mcp/server-manager.ts`):
  - Start/stop/toggle MCP server as child process
  - Auto-discovers server at workspace `mcp/build/index.js` or extension-bundled path
  - Status bar indicator (running/stopped/error) with click-to-toggle
  - Output channel for server logs
  - Passes `MEMORY_BANK_PATH` environment variable to server
- Updated all instruction files (Layers 0-3) to prioritize MCP tools over raw file reads
- Extension packaged as VSIX (v0.1.0) and installed for testing — sidebar and status bar confirmed working

## Current Decisions
- No model pinning: agents inherit user's default (ADR-0004)
- No tool restrictions: behavior guided by instructions, not tool blocking
- Quality-first: Claude Opus (latest) recommended, no cost-driven model switching
- Additive compatibility with original memory-bank.instructions.md (ADR-0001)
- Memory bank replaces PRD, ADRs kept for immutable decision history (ADR-0003)

## Next Steps
1. Real-world testing across different projects
