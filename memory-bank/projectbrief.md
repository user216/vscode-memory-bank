# Project Brief: vscode-memory-bank

## Overview
A 7-layer Memory Bank toolkit for VS Code + GitHub Copilot + Claude Agent SDK that provides persistent project context across AI coding sessions.

## Problem Statement
AI coding assistants lose all context between sessions and during context compaction. Existing solutions are either too simple (flat markdown files with no search) or too complex (full MCP servers requiring external infrastructure). None are purpose-built for the VS Code + GitHub Copilot + Claude model stack.

## Goals
- Maintain full backward compatibility with the [original memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) from github/awesome-copilot
- Provide a layered architecture where each layer adds capabilities without requiring the layers above it
- Layer 0 (instructions) must work standalone with zero dependencies
- Target exclusively: VS Code + GitHub Copilot extension + Claude Agent SDK
- Synthesize best features from 9+ existing memory MCP projects into a cohesive, opinionated solution

## Non-Goals
- Supporting other clients (Claude Desktop, Claude Code CLI, Cursor) — this targets VS Code + GitHub Copilot + Claude Agent SDK exclusively
- Replacing or forking the original memory-bank instruction — we extend it additively
- Building a general-purpose memory system for arbitrary AI agents or non-Claude models
- Enterprise features (multi-user, cloud sync, authentication)

## Architecture: 7 Layers
| Layer | Primitive | Purpose | Dependency |
|-------|-----------|---------|------------|
| 0 | Custom Instructions | Always-on memory bank conventions | None |
| 1 | Agent Skill | On-demand capability with templates/scripts | Layer 0 |
| 2 | Prompt Files | User-invoked workflows (/memory-*) | Layer 0 |
| 3 | Custom Agents | Plan/Act mode personas with handoffs | Layers 0-2 |
| 4 | Hooks | Automatic lifecycle capture/injection | Layers 0-1 |
| 5 | MCP Server | Structured queries, search, token budgeting | Layers 0-4 |
| 6 | VS Code Extension | UI panels, file watchers, event integration | All layers |

## Success Criteria
- Layer 0 works identically to the original memory-bank instruction
- Each layer demonstrably adds value over the layers below it
- A new user can install Layer 0 in under 1 minute
- Layers 0-4 require no compiled code or external dependencies
