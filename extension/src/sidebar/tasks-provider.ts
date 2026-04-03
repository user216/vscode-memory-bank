import * as vscode from "vscode";
import {
  extractStatus,
  extractTags,
  extractTitle,
  buildRelations,
  buildDescription,
  RelationItem,
  type Relation,
} from "./frontmatter-utils.js";

const TASK_STATUS_ORDER: Record<string, number> = {
  "in progress": 0,
  pending: 1,
  completed: 2,
  abandoned: 3,
};

export class TasksTreeProvider
  implements vscode.TreeDataProvider<TaskItem | RelationItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskItem | RelationItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private activeTagFilter: string | null = null;
  treeView: vscode.TreeView<TaskItem | RelationItem> | undefined;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  filterByTag(tag: string): void {
    this.activeTagFilter = tag;
    vscode.commands.executeCommand("setContext", "memoryBank.taskTagFilterActive", true);
    if (this.treeView) {
      this.treeView.description = `#${tag}`;
    }
    this.refresh();
  }

  clearTagFilter(): void {
    this.activeTagFilter = null;
    vscode.commands.executeCommand("setContext", "memoryBank.taskTagFilterActive", false);
    if (this.treeView) {
      this.treeView.description = "";
    }
    this.refresh();
  }

  async getAllTags(): Promise<string[]> {
    const tagSet = new Set<string>();
    const scan = async (dir: vscode.Uri, pattern?: RegExp) => {
      try {
        const entries = await vscode.workspace.fs.readDirectory(dir);
        for (const [name, type] of entries) {
          if (type !== vscode.FileType.File || !name.endsWith(".md")) continue;
          if (pattern && !pattern.test(name)) continue;
          if (name === "_index.md") continue;
          const content = Buffer.from(
            await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, name)),
          ).toString("utf-8");
          for (const tag of extractTags(content)) tagSet.add(tag);
        }
      } catch { /* ignore */ }
    };
    await scan(vscode.Uri.joinPath(this.mbRoot, "tasks"));
    await scan(this.mbRoot, /^TASK-\d+.*\.md$/);
    return [...tagSet].sort();
  }

  getTreeItem(element: TaskItem | RelationItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: TaskItem | RelationItem,
  ): Promise<(TaskItem | RelationItem)[]> {
    if (element instanceof RelationItem) return [];
    if (element instanceof TaskItem) {
      return element.relations.map(
        (r) => new RelationItem(r.targetId, r.relationType, this.mbRoot),
      );
    }

    // Root: collect all tasks
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
        const label = name.replace(".md", "");
        items.push(this.buildTaskItem(label, fileUri, content));
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
        const label = name.replace(".md", "");
        if (items.some((i) => i.fileId === label)) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(this.mbRoot, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");
        items.push(this.buildTaskItem(label, fileUri, content));
      }
    } catch {
      // ignore
    }

    // Sort by status priority
    items.sort((a, b) => {
      const ap = TASK_STATUS_ORDER[a.status.toLowerCase()] ?? 4;
      const bp = TASK_STATUS_ORDER[b.status.toLowerCase()] ?? 4;
      return ap - bp;
    });

    // Apply tag filter
    if (this.activeTagFilter) {
      const filter = this.activeTagFilter.toLowerCase();
      return items.filter((i) => i.tags.some((t) => t.toLowerCase() === filter));
    }

    return items;
  }

  private buildTaskItem(fileId: string, fileUri: vscode.Uri, content: string): TaskItem {
    const status = extractStatus(content);
    const tags = extractTags(content);
    const title = extractTitle(content, fileId);
    const relations = buildRelations(content, fileId);
    return new TaskItem(fileId, fileUri, status, title, tags, relations, this.mbRoot);
  }
}

class TaskItem extends vscode.TreeItem {
  public readonly relations: Relation[];
  public readonly status: string;
  public readonly fileId: string;
  public readonly tags: string[];

  constructor(
    fileId: string,
    public readonly fileUri: vscode.Uri,
    status: string,
    title: string,
    tags: string[],
    relations: Relation[],
    mbRoot: vscode.Uri,
  ) {
    super(
      fileId,
      relations.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.fileId = fileId;
    this.status = status;
    this.relations = relations;
    this.tags = tags;

    const descParts: string[] = [];
    if (title !== fileId) descParts.push(title);
    descParts.push(status);
    if (tags.length > 0) descParts.push(tags.join(", "));
    this.description = buildDescription(descParts);

    const tooltipLines = [`${fileId}: ${title}`, `Status: ${status}`];
    if (tags.length > 0) tooltipLines.push(`Tags: ${tags.join(", ")}`);
    if (relations.length > 0) tooltipLines.push(`Relations: ${relations.length}`);
    this.tooltip = tooltipLines.join("\n");

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
