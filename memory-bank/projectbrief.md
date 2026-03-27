---
type: core
title: Project Brief
created: 2026-03-09
updated: 2026-03-27
tags: [overview, architecture]
---
# Project Brief: vscode-memory-bank

## Overview
A Memory Bank toolkit for VS Code + GitHub Copilot + Claude Agent SDK that provides persistent project context across AI coding sessions. Uses an Obsidian-Zettelkasten approach with flat markdown files, YAML frontmatter, wikilinks, and tags.

## Problem Statement
AI coding assistants lose all context between sessions and during context compaction. Existing solutions are either too simple (flat markdown files with no search) or too complex (full MCP servers requiring external infrastructure). None are purpose-built for the VS Code + GitHub Copilot + Claude model stack.

## Goals
- Maintain backward compatibility with the [original memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) from github/awesome-copilot
- Provide a layered architecture where each component adds capabilities independently
- Instructions must work standalone with zero dependencies
- Target exclusively: VS Code + GitHub Copilot extension + Claude Agent SDK
- Synthesize best features from 9+ existing memory MCP projects into a cohesive, opinionated solution

## Non-Goals
- Supporting other clients (Claude Desktop, Claude Code CLI, Cursor)
- Replacing or forking the original memory-bank instruction — we extend it additively
- Building a general-purpose memory system for arbitrary AI agents or non-Claude models
- Enterprise features (multi-user, cloud sync, authentication)

## Architecture Components
| Component | Location | Purpose |
|-----------|----------|---------|
| Custom Instructions | `instructions/` | Always-on memory bank conventions |
| Agent Skills | `skills/` | On-demand capability with templates |
| Prompt Files | `.github/prompts/` | User-invoked workflows (/memory-*) |
| Custom Agents | `.github/agents/` | Plan/Act mode personas with handoffs |
| Hooks | `.github/hooks/` | Automatic lifecycle capture/injection |
| MCP Server | `mcp/` | Structured queries, search, token budgeting, knowledge graph |
| VS Code Extension | `extension/` | UI panels, file watchers, MCP server delivery |
| Copilot Plugin | `copilot-plugin/` | Skills + agents + hooks + prompts distribution |

## Success Criteria
- Instructions work identically to the original memory-bank instruction
- Each component adds value independently
- A new user can start in under 1 minute
- MCP server has zero native dependencies (pure JS only)
