import * as vscode from "vscode";
import type { MemoryBankTreeProvider } from "../sidebar/tree-provider.js";
import type { TasksTreeProvider } from "../sidebar/tasks-provider.js";
import type { DecisionsTreeProvider } from "../sidebar/decisions-provider.js";
import type { MemoryBankStatusBar } from "../statusbar/status-bar.js";
import type { McpServerManager } from "../mcp/server-manager.js";
import { KnowledgeGraphPanel } from "../webview/knowledge-graph.js";

export interface Providers {
  filesProvider: MemoryBankTreeProvider | undefined;
  tasksProvider: TasksTreeProvider | undefined;
  decisionsProvider: DecisionsTreeProvider | undefined;
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
      const tasksDir = vscode.Uri.joinPath(mbDir, "tasks");
      const decisionsDir = vscode.Uri.joinPath(mbDir, "decisions");

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
      await vscode.workspace.fs.createDirectory(tasksDir);
      await vscode.workspace.fs.createDirectory(decisionsDir);

      const encoder = new TextEncoder();

      // Create core files
      const coreFiles: Record<string, string> = {
        "projectbrief.md":
          "# Project Brief\n\n## Overview\n\n_Describe the project here._\n\n## Goals\n\n- \n\n## Non-Goals\n\n- \n",
        "productContext.md":
          "# Product Context\n\n## Why This Project Exists\n\n_Explain the problem being solved._\n\n## Target Users\n\n- \n\n## User Experience\n\n- \n",
        "systemPatterns.md":
          "# System Patterns\n\n## Architecture\n\n_Describe the high-level architecture._\n\n## Key Patterns\n\n- \n\n## Component Relationships\n\n- \n",
        "techContext.md":
          "# Tech Context\n\n## Tech Stack\n\n- \n\n## Dependencies\n\n- \n\n## Constraints\n\n- \n",
        "activeContext.md":
          "# Active Context\n\n## Current Focus\n\n- Project initialization\n\n## Recent Changes\n\n- Initialized Memory Bank\n\n## Next Steps\n\n- Fill in projectbrief.md\n",
        "progress.md":
          "# Progress\n\n## What Works\n\n- Memory Bank initialized\n\n## What's Left\n\n- Fill in all core documentation\n\n## Known Issues\n\n- None yet\n",
      };

      for (const [filename, content] of Object.entries(coreFiles)) {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(mbDir, filename),
          encoder.encode(content),
        );
      }

      // Create index files
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(tasksDir, "_index.md"),
        encoder.encode("# Tasks\n\n| ID | Title | Status |\n|---|---|---|\n"),
      );
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(decisionsDir, "_index.md"),
        encoder.encode(
          "# Decisions\n\n| ID | Title | Status |\n|---|---|---|\n",
        ),
      );

      // Create .gitignore — allow the SQLite DB, ignore transient WAL files
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(mbDir, ".gitignore"),
        encoder.encode(
          "# MCP server runtime directory\n.mcp/*\n\n# Keep the SQLite database (contains imported items, FTS index, and links)\n!.mcp/memory-bank.db\n\n# Ignore transient WAL/journal files (recreated at runtime)\n*.db-wal\n*.db-shm\n*.db-journal\n",
        ),
      );

      // Create .gitattributes — mark DB as binary so git doesn't diff it
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(mbDir, ".gitattributes"),
        encoder.encode("*.db binary\n"),
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
  );
}
