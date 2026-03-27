import * as vscode from "vscode";

export class McpSetupProvider implements vscode.TreeDataProvider<McpSetupItem> {
  constructor(
    private readonly mcpServerPath: string,
    private readonly memoryBankPath: string,
  ) {}

  getTreeItem(element: McpSetupItem): vscode.TreeItem {
    return element;
  }

  getChildren(): McpSetupItem[] {
    return [
      new McpSetupItem(
        "GitHub Copilot",
        "Auto-configured (.vscode/mcp.json)",
        "$(check)",
        undefined,
      ),
      new McpSetupItem(
        "Claude Code / Other",
        "Click to copy config",
        "$(copy)",
        {
          command: "memoryBank.copyMcpConfig",
          title: "Copy MCP Config",
          arguments: [this.mcpServerPath, this.memoryBankPath],
        },
      ),
    ];
  }
}

class McpSetupItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    iconId: string,
    command: vscode.Command | undefined,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(iconId.replace("$(", "").replace(")", ""));
    this.command = command;
  }
}
