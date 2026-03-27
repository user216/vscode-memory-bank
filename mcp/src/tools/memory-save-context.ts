import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile } from "../index-store.js";
import { getMemoryBankPath } from "./shared-utils.js";

export function registerMemorySaveContext(server: McpServer): void {
  server.tool(
    "memory_save_context",
    "[DEPRECATED] Previously saved activeContext.md. In v2 (ADR-0015), context is derived from in-progress tasks. This tool now appends a progress log to the most recently updated in-progress task. Prefer memory_update_status with log_entry parameter instead.",
    {
      current_focus: z
        .string()
        .describe("One-line summary of what the project is currently focused on (e.g. 'Implementing OAuth2 login flow')"),
      recent_changes: z
        .array(z.string())
        .describe("List of recent changes (each item becomes a bullet point). E.g. ['Added user login endpoint', 'Fixed session timeout bug']"),
      current_decisions: z
        .array(z.string())
        .optional()
        .describe("List of current active decisions (optional). If omitted, existing decisions are preserved from the current file."),
      next_steps: z
        .array(z.string())
        .optional()
        .describe("List of next steps, rendered as numbered list (optional). E.g. ['Add password reset flow', 'Write integration tests']"),
    },
    async ({ current_focus, recent_changes }) => {
      const mbPath = getMemoryBankPath();
      const store = getStore();

      // Find in-progress tasks, sorted by most recently updated
      const inProgressTasks = Array.from(store.items.values())
        .filter(item => item.type === "task" && item.status === "In Progress")
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

      if (inProgressTasks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "DEPRECATED: memory_save_context is deprecated in v2 (ADR-0015). " +
                "No in-progress tasks found to attach context to. " +
                "Use memory_create_task to create a task, or memory_update_status with log_entry to record progress.",
            },
          ],
        };
      }

      // Append context as a progress log entry to the most recent in-progress task
      const targetTask = inProgressTasks[0];
      const today = new Date().toISOString().slice(0, 10);
      const logEntry = `Focus: ${current_focus}. Changes: ${recent_changes.join("; ")}`;

      const filePath = path.join(mbPath, path.basename(targetTask.filePath));
      let content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes("## Progress Log")) {
        content += "\n## Progress Log\n";
      }
      content += `\n### ${today}\n${logEntry}\n`;
      fs.writeFileSync(filePath, content);
      reindexFile(store, filePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `DEPRECATED: memory_save_context is deprecated in v2 (ADR-0015). ` +
              `Context appended as progress log to ${targetTask.id}. ` +
              `Use memory_update_status with log_entry parameter instead.`,
          },
        ],
      };
    },
  );
}
