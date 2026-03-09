import * as vscode from "vscode";
import { MemoryBankTreeProvider } from "./sidebar/tree-provider.js";
import { TasksTreeProvider } from "./sidebar/tasks-provider.js";
import { DecisionsTreeProvider } from "./sidebar/decisions-provider.js";
import { MemoryBankStatusBar } from "./statusbar/status-bar.js";
import { McpServerManager } from "./mcp/server-manager.js";
import { registerCommands } from "./commands/index.js";

let statusBar: MemoryBankStatusBar | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;
let mcpManager: McpServerManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  const mbRoot = vscode.Uri.joinPath(
    vscode.Uri.file(workspaceRoot),
    "memory-bank",
  );

  // Sidebar tree views
  const filesProvider = new MemoryBankTreeProvider(mbRoot);
  const tasksProvider = new TasksTreeProvider(mbRoot);
  const decisionsProvider = new DecisionsTreeProvider(mbRoot);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("memoryBankFiles", filesProvider),
    vscode.window.registerTreeDataProvider("memoryBankTasks", tasksProvider),
    vscode.window.registerTreeDataProvider(
      "memoryBankDecisions",
      decisionsProvider,
    ),
  );

  // Status bar
  const config = vscode.workspace.getConfiguration("memoryBank");
  if (config.get<boolean>("statusBar.enabled", true)) {
    statusBar = new MemoryBankStatusBar(mbRoot);
    context.subscriptions.push(statusBar);
  }

  // MCP server manager
  mcpManager = new McpServerManager(mbRoot, context.extensionPath);
  context.subscriptions.push(mcpManager);

  // File watcher
  if (config.get<boolean>("fileWatcher.enabled", true)) {
    fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(mbRoot, "**/*.md"),
    );
    const refreshAll = () => {
      filesProvider.refresh();
      tasksProvider.refresh();
      decisionsProvider.refresh();
      statusBar?.refresh();
    };
    fileWatcher.onDidChange(refreshAll);
    fileWatcher.onDidCreate(refreshAll);
    fileWatcher.onDidDelete(refreshAll);
    context.subscriptions.push(fileWatcher);
  }

  // Commands
  registerCommands(context, {
    filesProvider,
    tasksProvider,
    decisionsProvider,
    statusBar,
    mcpManager,
    mbRoot,
    extensionUri: context.extensionUri,
  });
}

export function deactivate(): void {
  mcpManager?.dispose();
  statusBar?.dispose();
  fileWatcher?.dispose();
}
