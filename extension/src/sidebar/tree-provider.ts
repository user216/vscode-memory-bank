import * as vscode from "vscode";

// ADR-0015 §7: only projectbrief and README are expected v2 files
const EXPECTED_FILES = ["projectbrief.md", "README.md"];

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

    // Show expected files first (with missing warning if absent)
    for (const filename of EXPECTED_FILES) {
      const fileUri = vscode.Uri.joinPath(this.mbRoot, filename);
      const exists = await fileExists(fileUri);
      const label = filename.replace(".md", "");
      items.push(
        new MemoryBankItem(
          label,
          fileUri,
          exists,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
    }

    // Dynamically show any other root-level .md files (legacy core files, custom files)
    try {
      const entries = await vscode.workspace.fs.readDirectory(this.mbRoot);
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File) continue;
        if (!name.endsWith(".md")) continue;
        if (EXPECTED_FILES.includes(name)) continue;
        if (/^(TASK-|ADR-)/.test(name)) continue; // shown in other views

        const fileUri = vscode.Uri.joinPath(this.mbRoot, name);
        const label = name.replace(".md", "");
        items.push(
          new MemoryBankItem(
            label,
            fileUri,
            true,
            vscode.TreeItemCollapsibleState.None,
          ),
        );
      }
    } catch {
      /* directory doesn't exist yet */
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
