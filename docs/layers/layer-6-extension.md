# Layer 6: VS Code Extension

**Status:** Scaffolded (sidebar, status bar, commands, file watcher)
**VS Code Primitive:** VS Code Extension (Marketplace)
**Dependencies:** All layers
**Directory:** `extension/`

## What It Will Do

Layer 6 wraps all lower layers into a native VS Code extension that provides:
- Visual UI for memory bank state (sidebar, status bar, tree views)
- Editor event integration (file watchers, git branch changes)
- One-click installation of all layers
- Embedded MCP server (Layer 5) managed by the extension lifecycle

This is the highest-effort, lowest-priority layer. It should only be built after Layers 0-5 are validated and stable.

## What It Will Add Over Layers 0-5

| Feature | Layers 0-5 | Layer 6 |
|---------|------------|---------|
| Installation | Copy files to `.github/` folders | One-click install from Marketplace |
| Memory bank visibility | Read files or use slash commands | Sidebar tree view showing all memory state |
| Active context indicator | Must check activeContext.md | Status bar showing current focus |
| Knowledge graph view | Text-based queries | Visual webview with interactive graph |
| File change detection | Hooks on agent lifecycle events | `FileSystemWatcher` on any file save |
| Git branch awareness | Manual channel switching | Automatic context switching on branch change |
| MCP server lifecycle | User must configure mcp.json | Extension starts/stops MCP server automatically |
| Layer configuration | Manual file management | Settings UI for layer configuration |

## Planned Features

### Sidebar Tree View
- Expandable tree showing all memory bank files and their status
- Color indicators: green (up to date), yellow (stale), red (missing)
- Click to open any memory bank file
- Right-click to update individual files

### Status Bar
- Shows current active context summary (from activeContext.md)
- Shows number of active tasks
- Click to open `/memory-review`

### Knowledge Graph Webview
- Interactive visualization of decisions, patterns, tasks and their relationships
- Zoom, pan, filter by type
- Click nodes to navigate to the corresponding file

### Automatic Capture
- `FileSystemWatcher` detects source code changes
- Debounced updates to activeContext.md
- Git branch change → switch memory bank context channel
- Git commit → snapshot memory bank state

### Extension Settings
```json
{
  "memoryBank.autoCapture": true,
  "memoryBank.mcpServer.enabled": true,
  "memoryBank.statusBar.enabled": true,
  "memoryBank.sidebar.enabled": true
}
```

## Planned Architecture

```
┌─────────────────────────────────────────────┐
│              VS Code Extension              │
│  ┌───────────────────────────────────────┐  │
│  │  UI Layer                             │  │
│  │  - TreeDataProvider (sidebar)         │  │
│  │  - StatusBarItem (active context)     │  │
│  │  - WebviewPanel (knowledge graph)     │  │
│  │  - Commands (init, review, update)    │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Event Layer                          │  │
│  │  - FileSystemWatcher → auto-capture   │  │
│  │  - Git extension API → branch change  │  │
│  │  - onDidSaveTextDocument → staleness  │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Embedded MCP Server                  │  │
│  │  - Starts on extension activation     │  │
│  │  - Stops on extension deactivation    │  │
│  │  - Auto-configured (no mcp.json)      │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Layer Installer                      │  │
│  │  - Copies agents, skills, prompts,    │  │
│  │    hooks, instructions to .github/    │  │
│  │  - Configures settings                │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Why This Is Last

1. **Validation first** — Layers 0-4 need real-world usage before investing in UI
2. **Development cost** — VS Code Extension API is the most complex primitive
3. **Marginal value** — Layers 0-5 provide the core functionality; Layer 6 adds convenience
4. **Maintenance burden** — Extensions need updates for VS Code API changes

## Compatibility
- Target platform: VS Code + GitHub Copilot extension + Claude Agent SDK
- Model: Claude Opus (latest) — see `memory-bank-config.json`
- Will include all lower layers bundled
- Marketplace distribution for one-click installation
