import * as fs from "node:fs";
import * as path from "node:path";

interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Generate both MCP config files with correct absolute paths.
 *
 * - `.mcp.json` — Claude Code / Claude Agent SDK (absolute paths, "mcpServers" key)
 * - `.vscode/mcp.json` — GitHub Copilot (absolute server path, ${workspaceFolder} for env, "servers" key)
 *
 * Merges with existing configs — only adds/updates the "memory-bank" entry.
 */
export async function generateMcpConfigs(
  workspaceRoot: string,
  mcpServerPath: string,
): Promise<void> {
  const memoryBankPath = path.join(workspaceRoot, "memory-bank");

  // Claude Code: .mcp.json (absolute paths for everything)
  const claudeEntry: McpServerEntry = {
    command: "node",
    args: [mcpServerPath],
    env: { MEMORY_BANK_PATH: memoryBankPath },
  };
  writeConfigSafe(
    path.join(workspaceRoot, ".mcp.json"),
    "mcpServers",
    "memory-bank",
    claudeEntry,
  );

  // GitHub Copilot: .vscode/mcp.json (${workspaceFolder} for env path)
  const vscodeDir = path.join(workspaceRoot, ".vscode");
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
  const copilotEntry: McpServerEntry = {
    command: "node",
    args: [mcpServerPath],
    env: { MEMORY_BANK_PATH: "${workspaceFolder}/memory-bank" },
  };
  writeConfigSafe(
    path.join(vscodeDir, "mcp.json"),
    "servers",
    "memory-bank",
    copilotEntry,
  );
}

/**
 * Check if existing MCP configs have stale paths (e.g. after extension update)
 * and regenerate if needed.
 */
export async function updateMcpConfigPaths(
  workspaceRoot: string,
  mcpServerPath: string,
): Promise<void> {
  const claudeConfig = readJsonSafe(path.join(workspaceRoot, ".mcp.json"));
  const servers = claudeConfig?.mcpServers as
    | Record<string, { args?: string[] }>
    | undefined;
  const currentArgs = servers?.["memory-bank"]?.args?.[0];

  if (currentArgs && currentArgs !== mcpServerPath) {
    // Extension path changed (update/reinstall) — regenerate configs
    await generateMcpConfigs(workspaceRoot, mcpServerPath);
  }
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
