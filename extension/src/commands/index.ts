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

      // Create core files with YAML frontmatter (v2 layout)
      const today = new Date().toISOString().slice(0, 10);
      const coreFiles: Record<string, string> = {
        "projectbrief.md":
          `---\ntype: core\ntitle: Project Brief\ncreated: ${today}\nupdated: ${today}\ntags: [overview, architecture]\n---\n# Project Brief\n\n## Overview\n\n_Describe the project here._\n\n## Goals\n\n- \n\n## Non-Goals\n\n- \n`,
        "productContext.md":
          `---\ntype: core\ntitle: Product Context\ncreated: ${today}\nupdated: ${today}\ntags: [product, ux]\n---\n# Product Context\n\n## Why This Project Exists\n\n_Explain the problem being solved._\n\n## Target Users\n\n- \n\n## User Experience\n\n- \n`,
        "systemPatterns.md":
          `---\ntype: core\ntitle: System Patterns\ncreated: ${today}\nupdated: ${today}\ntags: [architecture, patterns]\n---\n# System Patterns\n\n## Architecture\n\n_Describe the high-level architecture._\n\n## Key Patterns\n\n- \n\n## Component Relationships\n\n- \n`,
        "techContext.md":
          `---\ntype: core\ntitle: Tech Context\ncreated: ${today}\nupdated: ${today}\ntags: [technology, stack]\n---\n# Tech Context\n\n## Tech Stack\n\n- \n\n## Dependencies\n\n- \n\n## Constraints\n\n- \n`,
        "activeContext.md":
          `---\ntype: core\ntitle: Active Context\ncreated: ${today}\nupdated: ${today}\n---\n# Active Context\n\n## Current Focus\n\n- Project initialization\n\n## Recent Changes\n\n- Initialized Memory Bank\n\n## Next Steps\n\n- Fill in projectbrief.md\n`,
        "progress.md":
          `---\ntype: core\ntitle: Progress\ncreated: ${today}\nupdated: ${today}\n---\n# Progress\n\n## What Works\n\n- Memory Bank initialized\n\n## What's Left\n\n- Fill in all core documentation\n\n## Known Issues\n\n- None yet\n`,
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
        const snippet = buildMcpConfigSnippet(serverPath, mbPath);
        await vscode.env.clipboard.writeText(snippet);
        vscode.window.showInformationMessage(
          "MCP config copied to clipboard — paste into your AI tool's MCP settings.",
        );
      },
    ),
  );
}
