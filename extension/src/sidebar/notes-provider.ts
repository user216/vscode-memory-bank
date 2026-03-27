import * as vscode from "vscode";

export class NotesTreeProvider
  implements vscode.TreeDataProvider<NoteItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    NoteItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: NoteItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<NoteItem[]> {
    const items: NoteItem[] = [];

    // Notes are v2-only — scan root for NOTE-*.md files
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
        const tags = extractTags(content);
        const label = name.replace(".md", "");
        items.push(new NoteItem(label, fileUri, tags));
      }
    } catch {
      // ignore
    }

    return items;
  }
}

/** Extract tags from YAML frontmatter. */
function extractTags(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return [];

  const tags: string[] = [];
  const lines = fmMatch[1].split(/\r?\n/);
  let inTags = false;

  for (const line of lines) {
    // tags: [inline, array]
    const inlineMatch = line.match(/^tags\s*:\s*\[(.+)\]/);
    if (inlineMatch) {
      return inlineMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, ""));
    }
    // tags:
    if (/^tags\s*:/.test(line)) {
      inTags = true;
      continue;
    }
    if (inTags) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        tags.push(itemMatch[1].trim().replace(/^["']|["']$/g, ""));
      } else {
        inTags = false;
      }
    }
  }

  return tags;
}

class NoteItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileUri: vscode.Uri,
    public readonly tags: string[],
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = tags.length > 0 ? tags.join(", ") : "";
    this.tooltip = `${label}${tags.length > 0 ? ` — ${tags.join(", ")}` : ""}`;

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
