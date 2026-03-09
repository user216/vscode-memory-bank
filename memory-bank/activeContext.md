# Active Context

## Current Focus
Initial project setup — scaffolding the 7-layer directory structure and initializing memory bank files for the vscode-memory-bank toolkit.

## Recent Changes
- Created GitHub repository: user216/vscode-memory-bank
- Added as git submodule to 8marta project
- Scaffolded directory structure for all 7 layers
- Created memory bank core files (projectbrief, productContext, techContext, systemPatterns)

## Current Decisions
- Repository name: `vscode-memory-bank` (emphasizes VS Code platform focus)
- License: Apache-2.0 (permissive, compatible with ConPort and other source projects)
- Using memory bank structure instead of separate PRD (projectbrief.md replaces PRD)
- ADRs nested inside memory bank as `decisions/` folder (additive to original structure)
- Full backward compatibility with original memory-bank.instructions.md is a hard constraint

## Next Steps
1. Create ADR-0001 documenting compatibility decision
2. Create Layer 0 instruction file (extended from original)
3. Create Layer 1 skill (SKILL.md + templates)
4. Create Layer 2 prompt files (/memory-init, /memory-update, /memory-review)
5. Create Layer 3 agent files (memory-planner, memory-worker)
6. Create Layer 4 hook configuration
