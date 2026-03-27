# Active Context

## Current Focus
Committing all pending changes — extension placeholder fix, MCP server v2.1.0 bundle, ADR-0020, updated changelogs

## Recent Changes
- Fixed 'No view is registered with id: memoryBankNotes' — eager placeholder view registration (ADR-0020)
- Created building-vscode-agent-plugins skill covering plugin.json schema, MCP bundling, distribution
- Rewrote copilot-plugin README with deep cross-platform install guide
- Updated extension CHANGELOG.md for v0.4.0 (3 new MCP tools, placeholder fix, MCP server v2.1.0)
- Updated ADR-0013 to reflect plugin v0.4.0 (skills-only, no MCP server)
- Created ADR-0020 for eager placeholder view registration

## Current Decisions
- ADR-0020: Eager placeholder tree view registration to prevent restore errors
- ADR-0019: Tester feedback — 3 new MCP tools, Notes sidebar, v1 migration
- ADR-0017: Plugin doesn't bundle MCP server — extension delivers it exclusively
- ADR-0013: Distribute as Copilot Agent Plugin via Git submodule

## Next Steps
1. Build new VSIX 0.4.0 with placeholder fix and create GitHub release
2. Test plugin install from clean clone on another machine
3. Sync building-vscode-agent-plugins skill to other workspaces

