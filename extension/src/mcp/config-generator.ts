import * as fs from "node:fs";
import * as path from "node:path";

interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Legacy key used in versions <=0.6.2. */
const LEGACY_KEY = "memory-bank";

/**
 * Derive a per-workspace MCP server key from the workspace folder name.
 * Example: workspace "my-project" → key "mbank-my-project"
 */
export function deriveServerKey(workspaceRoot: string): string {
  const folderName = path.basename(workspaceRoot)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `mbank-${folderName || "default"}`;
}

/**
 * Generate the GitHub Copilot MCP config at `.vscode/mcp.json`.
 *
 * Uses a per-workspace key (`mbank-{workspace}`) to avoid conflicts with
 * Claude's reserved `#memory` prefix. Migrates the old `memory-bank` key
 * if present, preserving user-customized `env` settings.
 */
export async function generateCopilotMcpConfig(
  workspaceRoot: string,
  mcpServerPath: string,
): Promise<void> {
  const vscodeDir = path.join(workspaceRoot, ".vscode");
  const configPath = path.join(vscodeDir, "mcp.json");

  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  const existing = readJsonSafe(configPath);
  if (!existing.servers) {
    existing.servers = {};
  }
  const servers = existing.servers as Record<string, McpServerEntry | undefined>;

  const serverKey = deriveServerKey(workspaceRoot);

  // Migrate from legacy "memory-bank" key if present
  const legacy = servers[LEGACY_KEY];
  const current = servers[serverKey];

  // Preserve user env from whichever key exists (prefer new key, fall back to legacy)
  const env = current?.env ?? legacy?.env ?? { MEMORY_BANK_PATH: "${workspaceFolder}/memory-bank" };

  // Remove legacy key
  if (legacy) {
    delete servers[LEGACY_KEY];
  }

  servers[serverKey] = {
    command: "node",
    args: [mcpServerPath],
    env,
  };

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
}

/**
 * Build a JSON config snippet for manual MCP setup (Claude Code, etc.)
 * Uses workspace name for unique key when available.
 */
export function buildMcpConfigSnippet(
  mcpServerPath: string,
  memoryBankPath: string,
  workspaceRoot?: string,
): string {
  const key = workspaceRoot ? deriveServerKey(workspaceRoot) : "mbank";
  const config = {
    [key]: {
      command: "node",
      args: [mcpServerPath],
      env: { MEMORY_BANK_PATH: memoryBankPath },
    },
  };
  return JSON.stringify(config, null, 2);
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}
