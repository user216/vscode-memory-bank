import * as vscode from "vscode";
import {
  extractTags,
  extractTitle,
  buildRelations,
  buildDescription,
  RelationItem,
  type Relation,
} from "./frontmatter-utils.js";

export class NotesTreeProvider
  implements vscode.TreeDataProvider<NoteItem | RelationItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    NoteItem | RelationItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: NoteItem | RelationItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: NoteItem | RelationItem,
  ): Promise<(NoteItem | RelationItem)[]> {
    if (element instanceof RelationItem) return [];
    if (element instanceof NoteItem) {
      return element.relations.map(
        (r) => new RelationItem(r.targetId, r.relationType, this.mbRoot),
      );
    }

    // Root: scan for NOTE-*.md files
    const items: NoteItem[] = [];

    try {
      const entries = await vscode.workspace.fs.readDirectory(this.mbRoot);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.match(/^NOTE-\d+.*\.md$/)) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(this.mbRoot, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(fileUri),
        ).toString("utf-8");
        const fileId = name.replace(".md", "");
        const tags = extractTags(content);
        const title = extractTitle(content, fileId);
        const relations = buildRelations(content, fileId);
        items.push(new NoteItem(fileId, fileUri, tags, title, relations, this.mbRoot));
      }
    } catch {
      // ignore
    }

    return items;
  }
}

class NoteItem extends vscode.TreeItem {
  public readonly relations: Relation[];

  constructor(
    public readonly fileId: string,
    public readonly fileUri: vscode.Uri,
    public readonly tags: string[],
    title: string,
    relations: Relation[],
    mbRoot: vscode.Uri,
  ) {
    super(
      title,
      relations.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.relations = relations;

    const descParts: string[] = [];
    if (title !== fileId) descParts.push(fileId);
    if (tags.length > 0) descParts.push(tags.join(", "));
    this.description = buildDescription(descParts);

    const tooltipLines = [`${fileId}: ${title}`];
    if (tags.length > 0) tooltipLines.push(`Tags: ${tags.join(", ")}`);
    if (relations.length > 0) tooltipLines.push(`Relations: ${relations.length}`);
    this.tooltip = tooltipLines.join("\n");

    this.iconPath = new vscode.ThemeIcon(
      "note",
      new vscode.ThemeColor("charts.blue"),
    );

    this.command = {
      command: "vscode.open",
      title: "Open Note",
      arguments: [fileUri],
    };

    this.contextValue = "memoryBankNote";
  }
}
