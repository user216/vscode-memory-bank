import * as vscode from "vscode";
import * as path from "node:path";

const CORE_FILES = [
  "projectbrief.md",
  "productContext.md",
  "systemPatterns.md",
  "techContext.md",
  "activeContext.md",
  "progress.md",
];

export class MemoryBankTreeProvider
  implements vscode.TreeDataProvider<MemoryBankItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MemoryBankItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly mbRoot: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: MemoryBankItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<MemoryBankItem[]> {
    const items: MemoryBankItem[] = [];

    for (const filename of CORE_FILES) {
      const fileUri = vscode.Uri.joinPath(this.mbRoot, filename);
      const exists = await fileExists(fileUri);
      const label = filename.replace(".md", "");
      const item = new MemoryBankItem(
        label,
        fileUri,
        exists,
        vscode.TreeItemCollapsibleState.None,
      );
      items.push(item);
    }

    return items;
  }
}

export class MemoryBankItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileUri: vscode.Uri,
    public readonly exists: boolean,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);

    this.tooltip = exists ? fileUri.fsPath : `${label} — missing`;
    this.description = exists ? "" : "missing";
    this.iconPath = exists
      ? new vscode.ThemeIcon("file", new vscode.ThemeColor("charts.green"))
      : new vscode.ThemeIcon(
          "warning",
          new vscode.ThemeColor("charts.red"),
        );

    if (exists) {
      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [fileUri],
      };
    }

    this.contextValue = exists ? "memoryBankFile" : "memoryBankFileMissing";
  }
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
