# Contributing to vscode-memory-bank

Thank you for your interest in contributing to vscode-memory-bank.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b my-feature`
4. Make your changes
5. Run tests: `cd mcp && npm test`
6. Commit your changes
7. Push and open a pull request

## Project Structure

```
Layer 0: instructions/          — Custom instruction files
Layer 1: skills/                — Agent skills with templates
Layer 2: prompts/               — Prompt files (/memory-*)
Layer 3: agents/                — Custom agents (Planner + Worker)
Layer 4: hooks/                 — Lifecycle hooks + scripts
Layer 5: mcp/                   — MCP server (TypeScript, SQLite+FTS5)
Layer 6: extension/             — VS Code extension (sidebar, webview, status bar)
```

## Building

### MCP Server
```bash
cd mcp
npm install
npm run build
npm test
```

### VS Code Extension
```bash
cd extension
npm install
npm run build
npx @vscode/vsce package --allow-missing-repository
```

## Guidelines

- Each layer should work independently without requiring layers above it
- Memory bank files must be valid markdown
- Layers 0-4 must have zero external dependencies
- Follow existing patterns and conventions in the codebase
- Run the MCP server tests before submitting changes

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Which layer is affected
