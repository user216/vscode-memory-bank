import * as vscode from "vscode";

export class DecisionsTreeProvider
  implements vscode.TreeDataProvider<DecisionItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    DecisionItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DecisionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<DecisionItem[]> {
    const decisionsDir = vscode.Uri.joinPath(this.mbRoot, "decisions");
    try {
      const entries = await vscode.workspace.fs.readDirectory(decisionsDir);
      const items: DecisionItem[] = [];

      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) {
          continue;
        }

        const fileUri = vscode.Uri.joinPath(decisionsDir, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");

        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
        const status = statusMatch?.[1]?.trim() ?? "Unknown";
        const label = name.replace(".md", "");

        items.push(new DecisionItem(label, fileUri, status));
      }

      return items;
    } catch {
      return [];
    }
  }
}

class DecisionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileUri: vscode.Uri,
    public readonly status: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = status;
    this.tooltip = `${label} — ${status}`;

    const iconId = statusIcon(status);
    const colorId = statusColor(status);
    this.iconPath = new vscode.ThemeIcon(iconId, new vscode.ThemeColor(colorId));

    this.command = {
      command: "vscode.open",
      title: "Open Decision",
      arguments: [fileUri],
    };

    this.contextValue = "memoryBankDecision";
  }
}

function statusIcon(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("accepted")) return "pass-filled";
  if (s.includes("proposed")) return "question";
  if (s.includes("deprecated")) return "warning";
  if (s.includes("superseded")) return "arrow-swap";
  return "circle-outline";
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("accepted")) return "charts.green";
  if (s.includes("proposed")) return "charts.yellow";
  if (s.includes("deprecated")) return "charts.orange";
  if (s.includes("superseded")) return "charts.purple";
  return "charts.yellow";
}
