import * as path from "node:path";
import * as fs from "node:fs";
import { execSync } from "node:child_process";

const MARKER_START = "# --- memory-bank-db-auto-stage ---";
const MARKER_END = "# --- end memory-bank-db-auto-stage ---";

const HOOK_BLOCK = `${MARKER_START}
# Auto-stage memory-bank.db when it has changes
if [ -f "memory-bank/.mcp/memory-bank.db" ]; then
  # Checkpoint WAL to merge pending writes into the main DB file
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "memory-bank/.mcp/memory-bank.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
  fi
  git add memory-bank/.mcp/memory-bank.db 2>/dev/null || true
fi
${MARKER_END}
`;

const GITIGNORE_CONTENT = `# MCP server runtime directory
.mcp/*

# Keep the SQLite database (contains imported items, FTS index, and links)
!.mcp/memory-bank.db

# Ignore transient WAL/journal files (recreated at runtime)
*.db-wal
*.db-shm
*.db-journal
`;

const GITATTRIBUTES_CONTENT = `*.db binary
`;

const DB_NEGATION = "!.mcp/memory-bank.db";

/**
 * Ensures memory-bank/.gitignore and .gitattributes are correctly configured.
 * For new workspaces: creates both files.
 * For existing workspaces: adds the DB negation rule if missing.
 */
export function ensureGitConfig(workspaceRoot: string): void {
  const mbDir = path.join(workspaceRoot, "memory-bank");
  if (!fs.existsSync(mbDir)) {
    return;
  }

  const giPath = path.join(mbDir, ".gitignore");
  const gaPath = path.join(mbDir, ".gitattributes");

  // .gitignore — create or patch
  if (fs.existsSync(giPath)) {
    const content = fs.readFileSync(giPath, "utf-8");
    if (!content.includes(DB_NEGATION)) {
      // Existing gitignore missing the DB negation — append it
      const patch = `\n# Keep the SQLite database (contains imported items, FTS index, and links)\n${DB_NEGATION}\n\n# Ignore transient WAL/journal files (recreated at runtime)\n*.db-wal\n*.db-shm\n*.db-journal\n`;
      const updated = content.endsWith("\n") ? content + patch : content + "\n" + patch;
      fs.writeFileSync(giPath, updated, "utf-8");
    }
  } else {
    fs.writeFileSync(giPath, GITIGNORE_CONTENT, "utf-8");
  }

  // .gitattributes — create if missing
  if (!fs.existsSync(gaPath)) {
    fs.writeFileSync(gaPath, GITATTRIBUTES_CONTENT, "utf-8");
  }
}

/**
 * Installs a git pre-commit hook that auto-stages memory-bank.db.
 * Safe to call multiple times — skips if the marker is already present.
 */
export function installGitHook(workspaceRoot: string): void {
  const mbDir = path.join(workspaceRoot, "memory-bank");
  if (!fs.existsSync(mbDir)) {
    return;
  }

  // Find .git directory (handles worktrees too)
  let gitDir: string;
  try {
    gitDir = execSync("git rev-parse --git-dir", {
      cwd: workspaceRoot,
      encoding: "utf-8",
    }).trim();
    if (!path.isAbsolute(gitDir)) {
      gitDir = path.join(workspaceRoot, gitDir);
    }
  } catch {
    // Not a git repo — nothing to do
    return;
  }

  const hooksDir = path.join(gitDir, "hooks");
  const hookPath = path.join(hooksDir, "pre-commit");

  // Read existing hook content (if any)
  let existing = "";
  if (fs.existsSync(hookPath)) {
    existing = fs.readFileSync(hookPath, "utf-8");
    // Already installed — nothing to do
    if (existing.includes(MARKER_START)) {
      return;
    }
  }

  // Ensure hooks directory exists
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  if (existing) {
    // Append to existing hook
    const content = existing.endsWith("\n")
      ? existing + "\n" + HOOK_BLOCK
      : existing + "\n\n" + HOOK_BLOCK;
    fs.writeFileSync(hookPath, content, "utf-8");
  } else {
    // Create new hook
    fs.writeFileSync(hookPath, "#!/bin/bash\n\n" + HOOK_BLOCK, "utf-8");
  }

  // Make executable
  fs.chmodSync(hookPath, 0o755);
}
