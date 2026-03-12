import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { MemoryBankTreeProvider } from "./sidebar/tree-provider.js";
import { TasksTreeProvider } from "./sidebar/tasks-provider.js";
import { DecisionsTreeProvider } from "./sidebar/decisions-provider.js";
import { MemoryBankStatusBar } from "./statusbar/status-bar.js";
import { McpServerManager } from "./mcp/server-manager.js";
import { McpServerBootstrap } from "./mcp/server-bootstrap.js";
import { generateMcpConfigs, updateMcpConfigPaths } from "./mcp/config-generator.js";
import { registerCommands, type Providers } from "./commands/index.js";
import { installGitHook, ensureGitConfig } from "./hooks/install-git-hook.js";

let statusBar: MemoryBankStatusBar | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;
let mcpManager: McpServerManager | undefined;

/** Mutable providers reference — populated by initializeFullUI(). */
const providers: Providers = {
  filesProvider: undefined,
  tasksProvider: undefined,
  decisionsProvider: undefined,
  statusBar: undefined,
  mcpManager: undefined,
  mbRoot: undefined as unknown as vscode.Uri,
  extensionUri: undefined as unknown as vscode.Uri,
};

/** Set up the full UI (sidebar views, status bar, watchers, git hooks, MCP). */
async function initializeFullUI(
  context: vscode.ExtensionContext,
  mbRoot: vscode.Uri,
  workspaceRoot: string,
): Promise<void> {
  // Guard against double-init
  if (providers.filesProvider) {
    return;
  }

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

  // MCP server bootstrap & config
  const mcpBootstrap = new McpServerBootstrap(context.extensionPath);
  const mcpServerPath = mcpBootstrap.getServerPath();

  if (!mcpBootstrap.isReady()) {
    const installed = await mcpBootstrap.install();
    if (!installed) {
      vscode.window.showWarningMessage(
        "Memory Bank: Failed to install MCP server dependencies. " +
          "MCP tools will not be available. Ensure Node.js 20+ is installed.",
      );
    }
  }

  if (mcpBootstrap.isReady()) {
    await generateMcpConfigs(workspaceRoot, mcpServerPath);
  }

  // MCP server manager (status bar indicator)
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

  // Git hooks
  installGitHook(workspaceRoot);
  ensureGitConfig(workspaceRoot);

  // Update mutable providers so commands can use them
  providers.filesProvider = filesProvider;
  providers.tasksProvider = tasksProvider;
  providers.decisionsProvider = decisionsProvider;
  providers.statusBar = statusBar;
  providers.mcpManager = mcpManager;
  providers.mbRoot = mbRoot;
  providers.extensionUri = context.extensionUri;

  // Flip context key so sidebar views appear
  await vscode.commands.executeCommand(
    "setContext",
    "memoryBank.initialized",
    true,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  const mbRoot = vscode.Uri.joinPath(
    vscode.Uri.file(workspaceRoot),
    "memory-bank",
  );

  // Store in providers so commands can access even before full init
  providers.mbRoot = mbRoot;
  providers.extensionUri = context.extensionUri;

  // Always register commands (they no-op gracefully when providers aren't ready)
  registerCommands(context, providers, () =>
    initializeFullUI(context, mbRoot, workspaceRoot),
  );

  // Check if memory-bank already exists
  const mbExists = fs.existsSync(path.join(workspaceRoot, "memory-bank"));

  void vscode.commands.executeCommand(
    "setContext",
    "memoryBank.initialized",
    mbExists,
  );

  if (mbExists) {
    // Full UI setup
    void initializeFullUI(context, mbRoot, workspaceRoot).then(() => {
      // After init, ensure MCP config paths match current extension path
      const mcpBootstrap = new McpServerBootstrap(context.extensionPath);
      if (mcpBootstrap.isReady()) {
        void updateMcpConfigPaths(workspaceRoot, mcpBootstrap.getServerPath());
      }
    });
  } else {
    // Show one-time notification
    const dismissed = context.globalState.get<boolean>(
      "memoryBank.initDismissed",
    );
    if (!dismissed) {
      void vscode.window
        .showInformationMessage(
          "Would you like to initialize a Memory Bank for this workspace?",
          "Initialize",
          "Not now",
          "Don't ask again",
        )
        .then((action) => {
          if (action === "Initialize") {
            void vscode.commands.executeCommand("memoryBank.init");
          } else if (action === "Don't ask again") {
            void context.globalState.update("memoryBank.initDismissed", true);
          }
        });
    }
  }
}

export function deactivate(): void {
  mcpManager?.dispose();
  statusBar?.dispose();
  fileWatcher?.dispose();
}
