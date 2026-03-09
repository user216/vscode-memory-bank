import * as vscode from "vscode";

export class TasksTreeProvider
  implements vscode.TreeDataProvider<TaskItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<TaskItem[]> {
    const tasksDir = vscode.Uri.joinPath(this.mbRoot, "tasks");
    try {
      const entries = await vscode.workspace.fs.readDirectory(tasksDir);
      const items: TaskItem[] = [];

      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) {
          continue;
        }

        const fileUri = vscode.Uri.joinPath(tasksDir, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");

        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
        const status = statusMatch?.[1]?.trim() ?? "Unknown";
        const label = name.replace(".md", "");

        items.push(new TaskItem(label, fileUri, status));
      }

      return items;
    } catch {
      return [];
    }
  }
}

class TaskItem extends vscode.TreeItem {
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
      title: "Open Task",
      arguments: [fileUri],
    };

    this.contextValue = "memoryBankTask";
  }
}

function statusIcon(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("completed")) return "pass-filled";
  if (s.includes("in progress")) return "loading~spin";
  if (s.includes("abandoned")) return "close";
  return "circle-outline";
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("completed")) return "charts.green";
  if (s.includes("in progress")) return "charts.blue";
  if (s.includes("abandoned")) return "charts.red";
  return "charts.yellow";
}
