# Active Context

## Current Focus
All 7 layers are built. Layer 6 (VS Code extension) has been scaffolded with sidebar tree views, status bar, commands, and file watcher. The project is ready for real-world testing and Marketplace packaging.

## Recent Changes
- Fixed test isolation: `db-sync.test.ts` now uses temp directories to avoid vitest parallel race conditions (65/65 tests pass)
- Fixed `update-model.sh`: now adds `model:` field to agents that don't have one, supports `--remove` flag, `jq`-optional
- Fixed all hook scripts: `jq`-optional fallbacks, fixed stop hook's infinite loop prevention (marker file instead of non-existent `stop_hook_active` field)
- Refined Planner agent: added read-only `tools` declaration, structured plan output format
- Refined Worker agent: added "run tests after changes" rule
- Built Layer 6 VS Code extension (`extension/`):
  - Sidebar tree views: Files, Tasks, Decisions with status icons and color indicators
  - Status bar: shows current focus from activeContext.md + task count
  - Commands: refresh, openFile, init (scaffolds a new memory bank)
  - FileSystemWatcher: auto-refreshes views on `.md` changes
  - Extension settings: `memoryBank.statusBar.enabled`, `memoryBank.fileWatcher.enabled`
  - Builds cleanly with TypeScript, targets VS Code 1.95+

## Current Decisions
- No model pinning: agents inherit user's default (ADR-0004)
- No tool restrictions: behavior guided by instructions, not tool blocking
- Quality-first: Claude Opus (latest) recommended, no cost-driven model switching
- Additive compatibility with original memory-bank.instructions.md (ADR-0001)
- Memory bank replaces PRD, ADRs kept for immutable decision history (ADR-0003)

## Next Steps
1. Package extension as VSIX and test in VS Code
2. Add Knowledge Graph webview (interactive visualization of links)
3. Add embedded MCP server lifecycle management in extension
4. Real-world testing across different projects
5. Publish to VS Code Marketplace
