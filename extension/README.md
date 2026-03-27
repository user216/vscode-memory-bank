# Memory Bank

Persistent AI project memory across sessions. Gives GitHub Copilot and Claude Code structured documentation, search, and a knowledge graph so every coding session picks up where the last one left off.

## The Problem

AI assistants forget everything between sessions. Every new chat starts from zero — you re-explain your architecture, re-describe your conventions, re-state what you're working on. Memory Bank solves this with a `memory-bank/` folder of structured markdown files that your AI reads at session start and updates as you work.

## Features

### Sidebar

Browse your project's memory bank directly in VS Code:

- **Files** — all memory bank markdown files
- **Tasks** — task tracking with status indicators (Pending, In Progress, Completed)
- **Decisions** — architecture decision records (ADRs) with acceptance status
- **Notes** — knowledge notes with tags
- **MCP Setup** — one-click configuration for GitHub Copilot and Claude Code

### MCP Server (bundled)

A Model Context Protocol server ships inside the extension — no separate install needed. It provides 21 tools for structured memory access:

| Tool | Purpose |
|------|---------|
| `memory_recall` | Token-budgeted context retrieval with priority strategies |
| `memory_search` | Full-text search with BM25 ranking, prefix/fuzzy matching |
| `memory_query` | Structured query by type, status, date range |
| `memory_create_task` | Create task files with auto-generated IDs |
| `memory_create_decision` | Create ADR files with standard format |
| `memory_create_note` | Create knowledge notes with tags |
| `memory_update_status` | Update task/decision status with progress logs |
| `memory_link` / `memory_graph` | Knowledge graph — typed relationships and traversal |
| `memory_verify_decisions` | Run compliance assertions from accepted ADRs |
| `memory_tags` | Browse and filter by tags |

### Knowledge Graph

Interactive force-directed visualization of relationships between tasks, decisions, notes, and project files. Launch via the command palette: **Memory Bank: Show Knowledge Graph**.

### Status Bar

Shows current project focus derived from in-progress tasks — always know what the AI thinks you're working on.

### Zero-Config Setup

1. Install the extension
2. Open a workspace
3. Click **Initialize Memory Bank** in the sidebar
4. The MCP server is auto-configured for GitHub Copilot — no manual setup

For Claude Code, click the **MCP Setup** section and copy the config snippet.

## Memory Bank Structure

```
memory-bank/
├── projectbrief.md        # Project goals, scope, requirements
├── README.md              # Navigation index with wikilinks
├── TASK-001.md            # Task files with YAML frontmatter
├── ADR-0001.md            # Architecture Decision Records
└── NOTE-001.md            # Knowledge notes with tags
```

Files use YAML frontmatter for metadata:

```yaml
---
type: task
status: In Progress
tags: [backend, auth]
created: 2026-03-15
---
# TASK-014: Implement OAuth2 login flow
```

## Works With

- **GitHub Copilot** — MCP server auto-configured, works immediately
- **Claude Code** — copy the MCP config from the sidebar
- **Any MCP-compatible client** — standard Model Context Protocol

## Copilot Agent Plugin

For teams that want skills, prompts, agents, and hooks without the VS Code extension, there's a standalone [Copilot Agent Plugin](https://github.com/user216/memory-bank-plugin) available as a Git submodule.

## Requirements

- VS Code 1.95+
- Node.js 20+ (for MCP server)
- GitHub Copilot extension (recommended) or Claude Code

## Commands

| Command | Description |
|---------|-------------|
| `Memory Bank: Initialize Memory Bank` | Create memory-bank/ folder with core files |
| `Memory Bank: Refresh` | Refresh sidebar views |
| `Memory Bank: Show Knowledge Graph` | Open interactive graph visualization |
| `Memory Bank: Toggle MCP Server` | Start/stop the MCP server |
| `Memory Bank: Copy MCP Config` | Copy MCP config JSON to clipboard |

## License

Apache License 2.0
