# ADR-0002: Use 7-Layer Progressive Enhancement Architecture

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
We researched 9 existing memory solutions for AI coding assistants:
- WhenMoon-afk/claude-memory-mcp (SQLite + hybrid scoring)
- mkreyman/mcp-memory-keeper (channels, checkpoints, multi-session)
- yuvalsuede/memory-mcp (hook-based silent capture, confidence decay)
- slaughters85j/claude-memory-mcp (semantic search, ONNX embeddings)
- mehdibizavar/claude-memory-mcp (CLAUDE.md bridge)
- mem0ai/mem0 (multi-level memory, vector stores)
- tristan-mcinnis/claude-code-agentic-semantic-memory-system-mcp (knowledge graph, pgvector)
- eliasonAdvising/claude-memory-mcp (graph traversal, progressive disclosure)
- GreatScottyMac/context-portal (structured DB, dual search, workspace detection)

Plus the original memory-bank.instructions.md from github/awesome-copilot and the full VS Code customization surface (instructions, skills, prompts, agents, hooks, MCP, extensions).

The question is how to organize these capabilities into a coherent system.

## Decision
Use a 7-layer progressive enhancement architecture where each layer adds capabilities without requiring layers above it:

| Layer | VS Code Primitive | Key Capability Added |
|-------|-------------------|---------------------|
| 0 | Custom Instructions | Core memory bank conventions (original instruction) |
| 1 | Agent Skill | Portable bundle with templates + scripts |
| 2 | Prompt Files | User-invoked slash commands |
| 3 | Custom Agents | Plan/Act personas with specialized tool sets |
| 4 | Hooks | Automatic lifecycle capture/injection |
| 5 | MCP Server | Structured queries, FTS, token budgeting |
| 6 | VS Code Extension | UI panels, file watchers, editor events |

## Alternatives Considered

### MCP-first (like most existing projects)
Build the MCP server as the core, instruction file as documentation.
- **Pro:** Most existing projects use this pattern, proven approach
- **Con:** Requires running a server process, adds installation friction, overkill for simple context persistence
- **Rejected because:** For VS Code + Copilot, instructions + skills + hooks cover 80% of the value with zero infrastructure.

### Extension-first
Build everything as a VS Code extension.
- **Pro:** Deepest IDE integration, full VS Code API access
- **Con:** Highest development cost, platform-locked, can't be used from CLI
- **Rejected because:** Too much upfront investment before validating the approach.

### Flat (all features at once)
Ship everything as a single package with no layering.
- **Pro:** Simpler mentally — one install, everything works
- **Con:** All-or-nothing, high complexity, hard to debug which layer is causing issues
- **Rejected because:** Progressive enhancement allows incremental adoption and testing.

## Consequences
- Users can adopt incrementally (start with Layer 0, add layers as needed)
- Each layer can be developed and tested independently
- Graceful degradation — if MCP server crashes, file-based fallback works
- More files to create and maintain
- Layer numbering creates an implicit priority order for development
