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

  // ADR-0015 §7: derive context from in-progress tasks, not activeContext.md
  async refresh(): Promise<void> {
    try {
      const { inProgressCount, latestFocus } = await this.getTaskContext();

      if (latestFocus) {
        this.item.text = `$(book) ${latestFocus.slice(0, 40)}`;
        this.item.tooltip = `Memory Bank — ${inProgressCount} task(s) in progress`;
      } else {
        this.item.text = "$(book) Memory Bank";
        this.item.tooltip = "Memory Bank — no tasks in progress";
      }
    } catch {
      this.item.text = "$(book) Memory Bank";
      this.item.tooltip = "Memory Bank — no active context";
    }
  }

  private async getTaskContext(): Promise<{
    inProgressCount: number;
    latestFocus: string | null;
  }> {
    let inProgressCount = 0;
    let latestFocus: string | null = null;

    // Scan flat TASK-*.md files (v2)
    try {
      const entries = await vscode.workspace.fs.readDirectory(this.mbRoot);
      for (const [name, type] of entries) {
        if (
          type !== vscode.FileType.File ||
          !name.startsWith("TASK-") ||
          !name.endsWith(".md")
        )
          continue;
        const uri = vscode.Uri.joinPath(this.mbRoot, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(uri),
        ).toString("utf-8");

        const isInProgress =
          /status:\s*In Progress/i.test(content) ||
          /\*\*Status:\*\*\s*In Progress/i.test(content);
        if (isInProgress) {
          inProgressCount++;
          if (!latestFocus) {
            const titleMatch = content.match(/^#\s+(.+)$/m);
            latestFocus =
              titleMatch?.[1]?.replace(/^TASK-\d+:\s*/, "") ?? name;
          }
        }
      }
    } catch {
      /* no files */
    }

    // Also scan v1 tasks/ subdir for backward compat
    try {
      const tasksDir = vscode.Uri.joinPath(this.mbRoot, "tasks");
      const entries = await vscode.workspace.fs.readDirectory(tasksDir);
      for (const [name, type] of entries) {
        if (
          type !== vscode.FileType.File ||
          name === "_index.md" ||
          !name.endsWith(".md")
        )
          continue;
        const uri = vscode.Uri.joinPath(tasksDir, name);
        const content = Buffer.from(
          await vscode.workspace.fs.readFile(uri),
        ).toString("utf-8");
        const isInProgress =
          /\*\*Status:\*\*\s*In Progress/i.test(content);
        if (isInProgress) {
          inProgressCount++;
          if (!latestFocus) {
            const titleMatch = content.match(/^#\s+(.+)$/m);
            latestFocus =
              titleMatch?.[1]?.replace(/^TASK-\d+:\s*/, "") ?? name;
          }
        }
      }
    } catch {
      /* no tasks dir */
    }

    return { inProgressCount, latestFocus };
  }

  dispose(): void {
    this.item.dispose();
  }
}
