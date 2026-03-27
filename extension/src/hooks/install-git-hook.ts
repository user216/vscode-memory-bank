import * as path from "node:path";
import * as fs from "node:fs";

const GITIGNORE_CONTENT = `# MCP server runtime directory
.mcp/*
`;

/**
 * Ensures memory-bank/.gitignore is correctly configured.
 * Since v2, there is no SQLite DB to manage — only ignore the .mcp/ runtime dir.
 */
export function ensureGitConfig(workspaceRoot: string): void {
  const mbDir = path.join(workspaceRoot, "memory-bank");
  if (!fs.existsSync(mbDir)) {
    return;
  }

  const giPath = path.join(mbDir, ".gitignore");

  if (!fs.existsSync(giPath)) {
    fs.writeFileSync(giPath, GITIGNORE_CONTENT, "utf-8");
  }
}

/**
 * No-op in v2 — the DB-staging pre-commit hook is no longer needed.
 * Kept as an export for backward compatibility with extension.ts imports.
 */
export function installGitHook(_workspaceRoot: string): void {
  // v2: no SQLite DB, no hook needed
}
