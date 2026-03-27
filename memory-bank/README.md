---
type: structure
tags: [index, navigation]
created: 2026-03-27
---
# Memory Bank — vscode-memory-bank

Project map and navigation for the vscode-memory-bank knowledge base.

## Project Overview
- [[projectbrief]] — Goals, non-goals, success criteria

## Active Tasks
- [[TASK-003]] — Real-World Testing Across Projects

## Completed Tasks
- [[TASK-001]] — Initial Project Scaffolding
- [[TASK-002]] — Layer 6 — VS Code Extension + MCP Write Tools + Plugin Compliance

## Architecture Decisions (Accepted)
- [[ADR-0001]] — Maintain Additive Compatibility with Original Instruction
- [[ADR-0002]] — Use 7-Layer Progressive Enhancement Architecture
- [[ADR-0003]] — Use Memory Bank Structure Instead of Separate PRD
- [[ADR-0004]] — No Model Version Pinning in Agent Files
- [[ADR-0005]] — Agent Identity is Claude Agent Preview, Not Claude Code CLI
- [[ADR-0007]] — Add memory_create_decision and memory_import_decisions MCP tools
- [[ADR-0009]] — Extract shared helpers into shared-utils.ts
- [[ADR-0011]] — Use CodeGraphContext as external end-user tool
- [[ADR-0012]] — Automate extension setup — zero manual steps after install
- [[ADR-0013]] — Distribute as Copilot Agent Plugin via Git submodule
- [[ADR-0014]] — Storage Format Analysis — Markdown vs Database
- [[ADR-0015]] — Memory Bank v2 Architecture — Obsidian-Zettelkasten Paradigm
- [[ADR-0016]] — Eliminate SQLite — Zero Native Dependencies
- [[ADR-0017]] — Remove Bundled MCP Server from Copilot Plugin
- [[ADR-0018]] — Bundle MCP Dependencies in VSIX Package
- [[ADR-0019]] — Tester Feedback — New MCP Tools, Sidebar Notes, v1 Migration
- [[ADR-0020]] — Eager Placeholder View Registration
- [[ADR-0021]] — 3-Layer ADR Compliance Verification

## Deprecated/Superseded Decisions
- [[ADR-0006]] — MCP Config at .mcp.json (Deprecated — SDK no longer uses it)
- [[ADR-0008]] — Auto-commit memory-bank.db (Deprecated — SQLite eliminated)
- [[ADR-0010]] — Integrate CodeGraphContext as submodule (Superseded by [[ADR-0011]])
