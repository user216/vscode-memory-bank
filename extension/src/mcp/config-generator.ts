import * as fs from "node:fs";
import * as path from "node:path";

interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Generate the GitHub Copilot MCP config at `.vscode/mcp.json`.
 *
 * Always ensures the server path points to the currently installed
 * extension version. This prevents stale paths after extension upgrades
 * (e.g. .../vscode-memory-bank-0.3.0/... → .../vscode-memory-bank-0.3.1/...).
 * Preserves any user-customized `env` settings.
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
  const current = servers["memory-bank"];

  // Preserve user-customized env, update everything else
  const env = current?.env ?? { MEMORY_BANK_PATH: "${workspaceFolder}/memory-bank" };

  servers["memory-bank"] = {
    command: "node",
    args: [mcpServerPath],
    env,
  };

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
}

/**
 * Build a JSON config snippet for manual MCP setup (Claude Code, etc.)
 */
export function buildMcpConfigSnippet(mcpServerPath: string, memoryBankPath: string): string {
  const config = {
    "memory-bank": {
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
