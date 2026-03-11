# ADR-0008: Auto-commit memory-bank.db via git hooks and extension activation

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:** 

## Context
The MCP server's SQLite DB (memory-bank/.mcp/memory-bank.db) contains imported items, FTS indexes, and 56+ cross-reference links that are generated at import time and may not reproduce identically. The DB doesn't auto-rebuild — the server creates an empty DB on startup, requiring manual memory_import_decisions to repopulate. Previously, the entire .mcp/ directory was gitignored, so the DB was never committed. Users who cloned the repo or lost the file would need to manually re-import everything.

## Decision
Implement a 3-layer automatic approach to ensure memory-bank.db is always committed:

1. **Extension activation** — `ensureGitConfig()` patches existing memory-bank/.gitignore to allow .mcp/memory-bank.db (negation rule), ignores WAL/SHM/journal files, and creates .gitattributes marking *.db as binary. `installGitHook()` installs a git pre-commit hook that checkpoints WAL and auto-stages the DB file. Both are idempotent and safe for existing workspaces.

2. **memoryBank.init command** — Creates .gitignore and .gitattributes alongside the core markdown files so new memory banks are git-ready from the start.

3. **Claude Code session-stop hook** — session-stop.sh now checkpoints WAL before the session ends, ensuring the .db file has all data even if the user doesn't commit immediately.

The ~300KB DB is small enough for git. WAL/SHM/journal files remain gitignored as transient runtime artifacts.

## Alternatives Considered

### Manual commit workflow
Require users to manually run sqlite3 PRAGMA wal_checkpoint and git add. Rejected because it's error-prone, easy to forget, and defeats the plug-and-play goal.

### Claude Code hook only
Only use a Claude Code session hook (PostToolUse or Stop) to stage the DB. Rejected because it only works during agent sessions, not for manual git workflows.

### Rebuild DB on startup from markdown
Re-parse all markdown files and rebuild the DB on every MCP server start. Rejected because cross-reference links generated at import time may not reproduce identically, and it adds startup latency.

## Consequences
- memory-bank.db is automatically committed on every git commit via pre-commit hook
- Existing workspaces get auto-patched on extension activation (no manual migration)
- New workspaces get correct .gitignore/.gitattributes from memoryBank.init
- WAL is checkpointed at session end and before every commit, ensuring DB file integrity
- Pre-commit hook is marker-guarded and appends safely to existing hooks
- Single-developer repos have no merge conflict risk on binary .db files

