import * as vscode from "vscode";
import * as path from "node:path";
import { McpServerBootstrap } from "./server-bootstrap.js";
import { generateMcpConfigs } from "./config-generator.js";

/**
 * MCP status bar indicator.
 *
 * The Claude Agent SDK (via .mcp.json) and GitHub Copilot (via .vscode/mcp.json)
 * manage the actual MCP server lifecycle. This class provides a status bar
 * indicator showing whether MCP configs exist, and clicking it opens the config
 * or offers to generate it.
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

  /** Check if MCP config files exist and update status bar. */
  async detectConfig(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.setStatus("not-configured");
      return;
    }

    const claudeExists = await this.fileExists(
      path.join(workspaceRoot, ".mcp.json"),
    );
    const copilotExists = await this.fileExists(
      path.join(workspaceRoot, ".vscode", "mcp.json"),
    );

    if (claudeExists || copilotExists) {
      this.setStatus("configured");
      this.outputChannel.appendLine(
        `MCP config found: ${claudeExists ? ".mcp.json" : ""} ${copilotExists ? ".vscode/mcp.json" : ""}`.trim(),
      );
    } else {
      this.setStatus("not-configured");
      this.outputChannel.appendLine("No MCP config found.");
    }
  }

  /** Open MCP config for inspection, or generate it if missing. */
  async openConfig(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage("No workspace folder open.");
      return;
    }

    const mcpConfigUri = vscode.Uri.file(
      path.join(workspaceRoot, ".mcp.json"),
    );

    if (await this.fileExists(mcpConfigUri.fsPath)) {
      await vscode.window.showTextDocument(mcpConfigUri);
      return;
    }

    const create = await vscode.window.showWarningMessage(
      "No .mcp.json found. Generate MCP config files for Claude Code and GitHub Copilot?",
      "Generate configs",
    );
    if (create) {
      const bootstrap = new McpServerBootstrap(this.extensionPath);
      if (!bootstrap.isReady()) {
        const installed = await bootstrap.install();
        if (!installed) {
          vscode.window.showErrorMessage(
            "Failed to install MCP server dependencies.",
          );
          return;
        }
      }
      await generateMcpConfigs(workspaceRoot, bootstrap.getServerPath());
      this.setStatus("configured");
      await vscode.window.showTextDocument(mcpConfigUri);
    }
  }

  toggle(): void {
    this.openConfig();
  }

  get isRunning(): boolean {
    return false;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private setStatus(state: "configured" | "not-configured"): void {
    switch (state) {
      case "configured":
        this.statusItem.text = "$(pass-filled) Memory Bank MCP";
        this.statusItem.tooltip =
          "MCP server configured — click to view config";
        this.statusItem.backgroundColor = undefined;
        break;
      case "not-configured":
        this.statusItem.text = "$(circle-slash) Memory Bank MCP";
        this.statusItem.tooltip =
          "No MCP config found — click to configure";
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
