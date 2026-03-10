import * as vscode from "vscode";
import * as path from "node:path";

/**
 * MCP status bar indicator.
 *
 * The Claude Agent SDK (via .mcp.json) manages the actual MCP server lifecycle.
 * This class provides a status bar indicator showing whether .mcp.json is
 * configured, and clicking it opens the .mcp.json file for inspection.
 *
 * It does NOT spawn or manage a server process — that's the SDK's job.
 */
export class McpServerManager implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private statusItem: vscode.StatusBarItem;

  constructor(
    private readonly mbRoot: vscode.Uri,
    private readonly extensionPath: string,
  ) {
    this.outputChannel = vscode.window.createOutputChannel("Memory Bank MCP");
    this.statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      49,
    );
    this.statusItem.command = "memoryBank.toggleMcp";
    this.detectConfig();
  }

  /** Check if .mcp.json exists and update status bar accordingly. */
  async detectConfig(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.setStatus("not-configured");
      return;
    }

    const mcpConfigPath = path.join(workspaceRoot, ".mcp.json");
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(mcpConfigPath));
      this.setStatus("configured");
      this.outputChannel.appendLine(
        `MCP config found: ${mcpConfigPath}`,
      );
    } catch {
      this.setStatus("not-configured");
      this.outputChannel.appendLine(
        `No .mcp.json found at ${mcpConfigPath}. MCP server not configured.`,
      );
    }
  }

  /** Open .mcp.json for inspection, or show a message if not found. */
  async openConfig(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage("No workspace folder open.");
      return;
    }

    const mcpConfigUri = vscode.Uri.file(
      path.join(workspaceRoot, ".mcp.json"),
    );

    try {
      await vscode.workspace.fs.stat(mcpConfigUri);
      await vscode.window.showTextDocument(mcpConfigUri);
    } catch {
      const create = await vscode.window.showWarningMessage(
        "No .mcp.json found. The Claude Agent SDK uses .mcp.json at the project root to register MCP servers.",
        "Create .mcp.json",
      );
      if (create) {
        const encoder = new TextEncoder();
        const template = JSON.stringify(
          {
            mcpServers: {
              "memory-bank": {
                command: "node",
                args: ["mcp/build/index.js"],
                env: {
                  MEMORY_BANK_PATH: "${workspaceFolder}/memory-bank",
                },
              },
            },
          },
          null,
          2,
        );
        await vscode.workspace.fs.writeFile(mcpConfigUri, encoder.encode(template));
        await vscode.window.showTextDocument(mcpConfigUri);
        this.setStatus("configured");
      }
    }
  }

  // Legacy compatibility — toggle now opens config
  toggle(): void {
    this.openConfig();
  }

  get isRunning(): boolean {
    // The SDK manages the server; we can only report config presence
    return false;
  }

  private setStatus(state: "configured" | "not-configured"): void {
    switch (state) {
      case "configured":
        this.statusItem.text = "$(pass-filled) Memory Bank MCP";
        this.statusItem.tooltip =
          "MCP server configured in .mcp.json — click to view config";
        this.statusItem.backgroundColor = undefined;
        break;
      case "not-configured":
        this.statusItem.text = "$(circle-slash) Memory Bank MCP";
        this.statusItem.tooltip =
          "No .mcp.json found — click to configure";
        this.statusItem.backgroundColor = undefined;
        break;
    }
    this.statusItem.show();
  }

  dispose(): void {
    this.statusItem.dispose();
    this.outputChannel.dispose();
  }
}
