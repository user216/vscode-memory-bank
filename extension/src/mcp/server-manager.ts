import * as vscode from "vscode";
import { ChildProcess, spawn } from "node:child_process";
import * as path from "node:path";

export class McpServerManager implements vscode.Disposable {
  private process: ChildProcess | null = null;
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
    this.setStatus("stopped");
  }

  async start(): Promise<void> {
    if (this.process) {
      this.outputChannel.appendLine("MCP server is already running.");
      return;
    }

    // Look for the MCP server in known locations
    const serverPath = await this.findServerPath();
    if (!serverPath) {
      this.outputChannel.appendLine(
        "MCP server not found. Install it with: cd mcp && npm install && npm run build",
      );
      this.setStatus("stopped");
      return;
    }

    this.outputChannel.appendLine(`Starting MCP server: node ${serverPath}`);
    this.outputChannel.appendLine(`MEMORY_BANK_PATH=${this.mbRoot.fsPath}`);

    this.process = spawn("node", [serverPath], {
      env: {
        ...process.env,
        MEMORY_BANK_PATH: this.mbRoot.fsPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.outputChannel.appendLine(data.toString().trim());
    });

    this.process.on("exit", (code) => {
      this.outputChannel.appendLine(`MCP server exited with code ${code}`);
      this.process = null;
      this.setStatus("stopped");
    });

    this.process.on("error", (err) => {
      this.outputChannel.appendLine(`MCP server error: ${err.message}`);
      this.process = null;
      this.setStatus("error");
    });

    this.setStatus("running");
  }

  stop(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
      this.setStatus("stopped");
      this.outputChannel.appendLine("MCP server stopped.");
    }
  }

  toggle(): void {
    if (this.process) {
      this.stop();
    } else {
      this.start();
    }
  }

  get isRunning(): boolean {
    return this.process !== null;
  }

  private async findServerPath(): Promise<string | null> {
    // Check workspace-local mcp/build/index.js
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      const localPath = path.join(workspaceRoot, "mcp", "build", "index.js");
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(localPath));
        return localPath;
      } catch { /* not found */ }
    }

    // Check extension-bundled path
    const bundledPath = path.join(this.extensionPath, "mcp", "build", "index.js");
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(bundledPath));
      return bundledPath;
    } catch { /* not found */ }

    return null;
  }

  private setStatus(state: "running" | "stopped" | "error"): void {
    switch (state) {
      case "running":
        this.statusItem.text = "$(pass-filled) Memory Bank MCP";
        this.statusItem.tooltip = "Memory Bank MCP server running — click to stop";
        this.statusItem.backgroundColor = undefined;
        break;
      case "stopped":
        this.statusItem.text = "$(circle-slash) Memory Bank MCP";
        this.statusItem.tooltip = "Memory Bank MCP server stopped — click to start";
        this.statusItem.backgroundColor = undefined;
        break;
      case "error":
        this.statusItem.text = "$(error) Memory Bank MCP";
        this.statusItem.tooltip = "Memory Bank MCP server error — click to retry";
        this.statusItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;
    }
    this.statusItem.show();
  }

  dispose(): void {
    this.stop();
    this.statusItem.dispose();
    this.outputChannel.dispose();
  }
}
