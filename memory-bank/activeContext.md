# Active Context

## Current Focus
Auto-commit memory-bank.db — 3-layer plug-and-play solution via extension activation, git hooks, and session-stop WAL checkpoint

## Recent Changes
- Added git pre-commit hook installer (extension/src/hooks/install-git-hook.ts) — auto-stages memory-bank.db with WAL checkpoint
- Added ensureGitConfig() — patches existing workspaces' .gitignore/.gitattributes on activation
- Updated memoryBank.init to create .gitignore and .gitattributes for new workspaces
- Updated memory-bank/.gitignore: .mcp/* with !.mcp/memory-bank.db negation, ignore WAL/SHM/journal
- Created memory-bank/.gitattributes: *.db binary
- Added WAL checkpoint to session-stop.sh hook for Claude Code sessions
- Created ADR-0008 documenting the auto-commit decision

## Current Decisions
- ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation

## Next Steps
1. Test extension activation in fresh workspace — verify hook installed and gitignore/gitattributes created
2. Test pre-commit hook — make a change to DB, commit unrelated file, verify DB auto-staged
3. Real-world testing across different projects

