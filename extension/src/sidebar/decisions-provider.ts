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

const DECISION_STATUS_ORDER: Record<string, number> = {
  proposed: 0,
  accepted: 1,
  deprecated: 2,
  superseded: 3,
  rejected: 4,
};

export class DecisionsTreeProvider
  implements vscode.TreeDataProvider<DecisionItem | RelationItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    DecisionItem | RelationItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DecisionItem | RelationItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: DecisionItem | RelationItem,
  ): Promise<(DecisionItem | RelationItem)[]> {
    if (element instanceof RelationItem) return [];
    if (element instanceof DecisionItem) {
      return element.relations.map(
        (r) => new RelationItem(r.targetId, r.relationType, this.mbRoot),
      );
    }

    // Root: collect all decisions
    const items: DecisionItem[] = [];

    // v1: decisions/ subdirectory
    const decisionsDir = vscode.Uri.joinPath(this.mbRoot, "decisions");
    try {
      const entries = await vscode.workspace.fs.readDirectory(decisionsDir);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(decisionsDir, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");
        const label = name.replace(".md", "");
        items.push(this.buildDecisionItem(label, fileUri, content));
      }
    } catch {
      // decisions/ directory doesn't exist — try flat layout
    }

    // v2: flat ADR-*.md files in memory-bank root
    try {
      const entries = await vscode.workspace.fs.readDirectory(this.mbRoot);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.match(/^ADR-\d+.*\.md$/)) {
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
        items.push(this.buildDecisionItem(label, fileUri, content));
      }
    } catch {
      // ignore
    }

    // Sort by status priority
    items.sort((a, b) => {
      const ap = DECISION_STATUS_ORDER[a.status.toLowerCase()] ?? 5;
      const bp = DECISION_STATUS_ORDER[b.status.toLowerCase()] ?? 5;
      return ap - bp;
    });

    return items;
  }

  private buildDecisionItem(fileId: string, fileUri: vscode.Uri, content: string): DecisionItem {
    const status = extractStatus(content);
    const tags = extractTags(content);
    const title = extractTitle(content, fileId);
    const relations = buildRelations(content, fileId);
    return new DecisionItem(fileId, fileUri, status, title, tags, relations, this.mbRoot);
  }
}

class DecisionItem extends vscode.TreeItem {
  public readonly relations: Relation[];
  public readonly status: string;
  public readonly fileId: string;

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
