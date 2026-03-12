# ADR-0013: Distribute as Copilot Agent Plugin via Git submodule

**Status:** Accepted
**Date:** 2026-03-12
**Deciders:** 

## Context
VS Code Agent Plugins (Preview, March 2026) are a new distribution model — Git repos with plugin.json, skills, agents, hooks, and MCP configs. Unlike VSIX extensions, they auto-update via git, install through @agentPlugins search, and don't require the VS Code Marketplace. The memory-bank toolkit already has all the assets (skills, agents, hooks, prompts, instructions) but distributes them only as part of the monorepo or via VSIX.

## Decision
Create a separate Git repo (user216/memory-bank-plugin) containing all plugin assets and add it as a submodule at copilot-plugin/. The plugin's .mcp.json uses npx to run the MCP server from npm (vscode-memory-bank-mcp). This gives dual distribution: VSIX extension for the full VS Code UI experience, and Agent Plugin for zero-config Copilot agent integration.

## Alternatives Considered

### Keep assets only in monorepo
Users would manually copy skills/agents/hooks into their projects. No auto-discovery, no plugin marketplace presence.

### Symlink or path reference without submodule
Would work locally but not for distribution. Git submodule provides a clean boundary and its own versioning.

## Consequences
- Plugin repo (memory-bank-plugin) must be kept in sync when skills/agents/hooks/prompts change in the monorepo
- MCP server must be published to npm for npx to work — until then, users need a local MCP server path
- Plugin is discoverable via @agentPlugins in VS Code once added to a marketplace repo
- Dual distribution: VSIX for UI features, Agent Plugin for Copilot agent integration

