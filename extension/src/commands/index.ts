import * as vscode from "vscode";
import type { MemoryBankTreeProvider } from "../sidebar/tree-provider.js";
import type { TasksTreeProvider } from "../sidebar/tasks-provider.js";
import type { DecisionsTreeProvider } from "../sidebar/decisions-provider.js";
import type { NotesTreeProvider } from "../sidebar/notes-provider.js";
import type { MemoryBankStatusBar } from "../statusbar/status-bar.js";
import type { McpServerManager } from "../mcp/server-manager.js";
import { buildMcpConfigSnippet } from "../mcp/config-generator.js";
import { KnowledgeGraphPanel } from "../webview/knowledge-graph.js";

export interface Providers {
  filesProvider: MemoryBankTreeProvider | undefined;
  tasksProvider: TasksTreeProvider | undefined;
  decisionsProvider: DecisionsTreeProvider | undefined;
  notesProvider: NotesTreeProvider | undefined;
  statusBar: MemoryBankStatusBar | undefined;
  mcpManager: McpServerManager | undefined;
  mbRoot: vscode.Uri;
  extensionUri: vscode.Uri;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  providers: Providers,
  onInit: () => Promise<void>,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.refresh", () => {
      providers.filesProvider?.refresh();
      providers.tasksProvider?.refresh();
      providers.decisionsProvider?.refresh();
      providers.notesProvider?.refresh();
      providers.statusBar?.refresh();
    }),

    vscode.commands.registerCommand(
      "memoryBank.openFile",
      (uri: vscode.Uri) => {
        vscode.window.showTextDocument(uri);
      },
    ),

    vscode.commands.registerCommand("memoryBank.init", async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage(
          "No workspace folder open. Open a folder first.",
        );
        return;
      }

      const mbDir = vscode.Uri.joinPath(workspaceRoot, "memory-bank");

      try {
        await vscode.workspace.fs.stat(mbDir);
        vscode.window.showInformationMessage(
          "Memory Bank already exists in this workspace.",
        );
        return;
      } catch {
        // Directory doesn't exist — create it
      }

      await vscode.workspace.fs.createDirectory(mbDir);

      const encoder = new TextEncoder();

      // Create core files with YAML frontmatter (v2 layout — ADR-0015 §7)
      const today = new Date().toISOString().slice(0, 10);
      const coreFiles: Record<string, string> = {
        "projectbrief.md":
          `---\ntype: core\ntitle: Project Brief\ncreated: ${today}\nupdated: ${today}\ntags: [overview]\n---\n# Project Brief\n\n## Overview\n\n_Describe the project here._\n\n## Goals\n\n- \n\n## Non-Goals\n\n- \n`,
        "README.md":
          `---\ntype: structure\ntitle: Memory Bank Index\ncreated: ${today}\nupdated: ${today}\n---\n# Memory Bank\n\nProject map and navigation.\n\n- [[projectbrief]] — Project overview, goals, constraints\n\n## Tasks\n\n_Use \`memory_create_task\` or create TASK-NNN.md files._\n\n## Decisions\n\n_Use \`memory_create_decision\` or create ADR-NNNN.md files._\n\n## Notes\n\n_Use \`memory_create_note\` for knowledge items, patterns, and reference material._\n`,
      };

      for (const [filename, content] of Object.entries(coreFiles)) {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(mbDir, filename),
          encoder.encode(content),
        );
      }

      // Create .gitignore — ignore .mcp/ runtime directory
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(mbDir, ".gitignore"),
        encoder.encode(
          "# MCP server runtime directory\n.mcp/\n",
        ),
      );

      vscode.window.showInformationMessage(
        "Memory Bank initialized! Setting up MCP server...",
      );

      // Initialize the full UI (sidebar, status bar, MCP, git hooks) — no reload needed
      await onInit();

      // Refresh views now that providers are available
      providers.filesProvider?.refresh();
      providers.tasksProvider?.refresh();
      providers.decisionsProvider?.refresh();
      providers.notesProvider?.refresh();
      providers.statusBar?.refresh();
    }),

    vscode.commands.registerCommand("memoryBank.showGraph", () => {
      if (!providers.extensionUri || !providers.mbRoot) {
        vscode.window.showWarningMessage(
          "Initialize a Memory Bank first.",
        );
        return;
      }
      KnowledgeGraphPanel.createOrShow(
        providers.extensionUri,
        providers.mbRoot,
      );
    }),

    vscode.commands.registerCommand("memoryBank.toggleMcp", () => {
      providers.mcpManager?.toggle();
    }),

    vscode.commands.registerCommand(
      "memoryBank.copyMcpConfig",
      async (mcpServerPath?: string, memoryBankPath?: string) => {
        const serverPath = mcpServerPath ?? "node_modules/.../mcp-server/build/index.js";
        const mbPath = memoryBankPath ?? "./memory-bank";
        const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const snippet = buildMcpConfigSnippet(serverPath, mbPath, wsRoot);
        await vscode.env.clipboard.writeText(snippet);
        vscode.window.showInformationMessage(
          "MCP config copied to clipboard — paste into your AI tool's MCP settings.",
        );
      },
    ),

    vscode.commands.registerCommand("memoryBank.filterTasksByTag", async () => {
      const tags = await providers.tasksProvider?.getAllTags();
      if (!tags?.length) {
        vscode.window.showInformationMessage("No tags found on tasks.");
        return;
      }
      const picked = await vscode.window.showQuickPick(
        tags.map((t) => ({ label: `#${t}` })),
        { placeHolder: "Select a tag to filter tasks" },
      );
      if (picked) {
        providers.tasksProvider?.filterByTag(picked.label.slice(1));
      }
    }),

    vscode.commands.registerCommand("memoryBank.clearTaskTagFilter", () => {
      providers.tasksProvider?.clearTagFilter();
    }),
  );
}
