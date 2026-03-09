import * as vscode from "vscode";

export class MemoryBankStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private readonly mbRoot: vscode.Uri;

  constructor(mbRoot: vscode.Uri) {
    this.mbRoot = mbRoot;
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.item.command = "memoryBank.refresh";
    this.item.name = "Memory Bank";
    this.refresh();
    this.item.show();
  }

  async refresh(): Promise<void> {
    try {
      const activeUri = vscode.Uri.joinPath(this.mbRoot, "activeContext.md");
      const content = Buffer.from(
        await vscode.workspace.fs.readFile(activeUri),
      ).toString("utf-8");

      // Extract current focus from active context
      const focusMatch = content.match(
        /##\s*(?:Current Focus|What I'm Working On)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i,
      );
      const focus = focusMatch?.[1]?.trim().split("\n")[0]?.replace(/^[-*]\s*/, "").slice(0, 40) ?? "Active";

      // Count active tasks
      const taskCount = await this.countTasks();

      this.item.text = `$(book) ${focus}`;
      this.item.tooltip = `Memory Bank — ${taskCount} task(s)`;
    } catch {
      this.item.text = "$(book) Memory Bank";
      this.item.tooltip = "Memory Bank — no active context";
    }
  }

  private async countTasks(): Promise<number> {
    try {
      const tasksDir = vscode.Uri.joinPath(this.mbRoot, "tasks");
      const entries = await vscode.workspace.fs.readDirectory(tasksDir);
      return entries.filter(
        ([name, type]) =>
          type === vscode.FileType.File &&
          name !== "_index.md" &&
          name.endsWith(".md"),
      ).length;
    } catch {
      return 0;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
