import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import * as cp from "node:child_process";

/**
 * Manages MCP server dependency installation.
 *
 * The MCP server's compiled JS and package.json are bundled inside the
 * extension VSIX. On first activation, this class runs `npm install --production`
 * to install native dependencies (better-sqlite3) for the host platform.
 */
export class McpServerBootstrap {
  private readonly mcpServerDir: string;

  constructor(private readonly extensionPath: string) {
    this.mcpServerDir = path.join(extensionPath, "mcp-server");
  }

  /** Check if MCP server dependencies are installed and ready. */
  isReady(): boolean {
    return fs.existsSync(
      path.join(this.mcpServerDir, "node_modules", "better-sqlite3"),
    );
  }

  /** Absolute path to the MCP server entry point. */
  getServerPath(): string {
    return path.join(this.mcpServerDir, "build", "index.js");
  }

  /** Install MCP server dependencies with a progress notification. */
  async install(): Promise<boolean> {
    // Guard: if mcp-server/ doesn't exist in the extension, skip
    if (!fs.existsSync(path.join(this.mcpServerDir, "package.json"))) {
      return false;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Memory Bank: Installing MCP server dependencies...",
        cancellable: false,
      },
      async () => {
        return new Promise<boolean>((resolve) => {
          const child = cp.spawn("npm", ["install", "--production"], {
            cwd: this.mcpServerDir,
            shell: true,
            env: { ...process.env, npm_config_loglevel: "error" },
          });

          let stderr = "";
          child.stderr?.on("data", (data: Buffer) => {
            stderr += data.toString();
          });

          child.on("close", (code) => {
            if (code !== 0) {
              console.error(`MCP npm install failed: ${stderr}`);
            }
            resolve(code === 0);
          });

          child.on("error", (err) => {
            console.error(`MCP npm install error: ${err.message}`);
            resolve(false);
          });
        });
      },
    );
  }
}
