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
 * Only writes if the "memory-bank" entry does NOT already exist —
 * never overwrites user-customized configs.
 */
export async function generateCopilotMcpConfig(
  workspaceRoot: string,
  mcpServerPath: string,
): Promise<void> {
  const vscodeDir = path.join(workspaceRoot, ".vscode");
  const configPath = path.join(vscodeDir, "mcp.json");

  // Skip if memory-bank entry already exists
  const existing = readJsonSafe(configPath);
  const servers = existing.servers as Record<string, unknown> | undefined;
  if (servers?.["memory-bank"]) {
    return;
  }

  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
  const copilotEntry: McpServerEntry = {
    command: "node",
    args: [mcpServerPath],
    env: { MEMORY_BANK_PATH: "${workspaceFolder}/memory-bank" },
  };
  writeConfigSafe(configPath, "servers", "memory-bank", copilotEntry);
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

function writeConfigSafe(
  filePath: string,
  rootKey: string,
  serverName: string,
  entry: McpServerEntry,
): void {
  const existing = readJsonSafe(filePath);
  if (!existing[rootKey]) {
    existing[rootKey] = {};
  }
  (existing[rootKey] as Record<string, unknown>)[serverName] = entry;

  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}
