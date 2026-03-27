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
    const items: TaskItem[] = [];

    // v1: tasks/ subdirectory
    const tasksDir = vscode.Uri.joinPath(this.mbRoot, "tasks");
    try {
      const entries = await vscode.workspace.fs.readDirectory(tasksDir);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(tasksDir, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");
        const status = extractStatus(content);
        const label = name.replace(".md", "");
        items.push(new TaskItem(label, fileUri, status));
      }
    } catch {
      // tasks/ directory doesn't exist — try flat layout
    }

    // v2: flat TASK-*.md files in memory-bank root
    try {
      const entries = await vscode.workspace.fs.readDirectory(this.mbRoot);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.match(/^TASK-\d+.*\.md$/)) {
          continue;
        }
        // Skip if we already found this in tasks/ subdir
        const label = name.replace(".md", "");
        if (items.some((i) => i.label === label)) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(this.mbRoot, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");
        const status = extractStatus(content);
        items.push(new TaskItem(label, fileUri, status));
      }
    } catch {
      // ignore
    }

    return items;
  }
}

/** Extract status from YAML frontmatter or **Status:** metadata. */
function extractStatus(content: string): string {
  // Try YAML frontmatter first
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const statusLine = fmMatch[1].match(/^status\s*:\s*(.+)$/m);
    if (statusLine) {
      return statusLine[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  // Fall back to **Status:** pattern
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (statusMatch) return statusMatch[1].trim();

  // Fall back to ## Status: heading pattern
  const headingMatch = content.match(/^##\s+Status:\s*(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return "Unknown";
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
