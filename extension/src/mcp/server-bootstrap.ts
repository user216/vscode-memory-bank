import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Manages MCP server readiness.
 *
 * Since v2, all MCP server dependencies are pure JS and bundled at build time
 * inside the extension VSIX. No runtime `npm install` is needed.
 */
export class McpServerBootstrap {
  private readonly mcpServerDir: string;

  constructor(private readonly extensionPath: string) {
    this.mcpServerDir = path.join(extensionPath, "mcp-server");
  }

  /** Check if MCP server is bundled and ready. */
  isReady(): boolean {
    return fs.existsSync(this.getServerPath());
  }

  /** Absolute path to the MCP server entry point. */
  getServerPath(): string {
    return path.join(this.mcpServerDir, "build", "index.js");
  }
}
