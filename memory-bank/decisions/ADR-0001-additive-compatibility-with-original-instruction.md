# ADR-0001: Maintain Additive Compatibility with Original memory-bank.instructions.md

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
The [original memory-bank.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/memory-bank.instructions.md) from github/awesome-copilot defines a structured approach to persistent AI memory using 7 core markdown files, 3 workflows (Plan/Act/Task Management), and task commands. We are building a toolkit that extends this approach with VS Code-specific integrations (skills, agents, hooks, MCP).

The question is whether to fork and modify the original instruction, or to maintain strict compatibility and only add new features on top.

## Decision
We will maintain **full backward compatibility** with the original instruction. All changes must be **additive only**:
- Never remove or rename existing core files (projectbrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, progress.md, tasks/)
- Never change existing workflow behavior (Plan Mode, Act Mode, Task Management)
- Never modify existing task commands (add/create, update, show)
- New features are added as new sections, new files, or new folders
- The original instruction file is used as Layer 0 with minimal additions

## Alternatives Considered

### Fork and rewrite
Create a completely new instruction with incompatible structure.
- **Pro:** Freedom to redesign from scratch, optimize for Claude specifically
- **Con:** Breaks existing workflows, can't benefit from upstream improvements, fragments ecosystem
- **Rejected because:** The original instruction is well-designed and widely adopted. Fragmenting the ecosystem provides no value.

### Strict superset with heavy modifications
Modify the original heavily while keeping the same file names.
- **Pro:** Could optimize file structure and workflows
- **Con:** Subtle incompatibilities with original, confusing for users familiar with the original
- **Rejected because:** "Compatible but different" is worse than either full compatibility or clean break.

### Wrapper/adapter pattern
Don't touch the instruction at all, build everything in higher layers.
- **Pro:** Zero risk of compatibility issues
- **Con:** Can't add helpful sections to the instruction itself (like decisions/ folder documentation)
- **Rejected because:** Some additive enhancements in Layer 0 are valuable and don't break compatibility.

## Consequences
- The original instruction's 7 core files, 3 workflows, and task commands are frozen
- New features (decisions/ folder, hook integration notes, skill references) are added as new sections
- Users can switch between the original instruction and our extended version without migration
- We can track upstream changes and merge them without conflicts
- Layer 0 will be slightly larger than the original due to additive sections
