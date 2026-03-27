import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile } from "../index-store.js";
import { getMemoryBankPath, getNextId } from "./shared-utils.js";

export function registerMemoryCreateTask(server: McpServer): void {
  server.tool(
    "memory_create_task",
    "Create a new task in the memory bank with proper formatting, auto-generated TASK-NNN ID, and index update. Creates a markdown file in memory-bank/tasks/ and syncs to the in-memory index. Initial status is always Pending — use memory_update_status to change it later.",
    {
      title: z.string().describe("Task title — short, descriptive (e.g. 'Implement user authentication', 'Fix login redirect bug')"),
      request: z.string().describe("Original request or description of what needs to be done. Can be multi-line."),
      plan: z
        .array(z.string())
        .optional()
        .describe("Implementation plan steps, rendered as numbered list (optional). E.g. ['Set up auth middleware', 'Add login endpoint', 'Write tests']"),
      subtasks: z
        .array(z.string())
        .optional()
        .describe("Subtask descriptions for progress tracking table (optional). E.g. ['Backend API', 'Frontend form', 'Integration tests']"),
    },
    async ({ title, request, plan, subtasks }) => {
      const mbPath = getMemoryBankPath();
      const today = new Date().toISOString().slice(0, 10);

      // v2 flat layout: files in root, also check legacy tasks/ subdir for ID continuity
      const taskId = getNextId(mbPath, "TASK-", 3);
      const fileName = `${taskId}.md`;
      const filePath = path.join(mbPath, fileName);

      // v2 format: YAML frontmatter
      let md = `---\ntype: task\nstatus: Pending\ncreated: ${today}\nupdated: ${today}\n---\n`;
      md += `# ${taskId}: ${title}\n\n`;
      md += `## Request\n${request}\n\n`;

      if (plan && plan.length > 0) {
        md += `## Plan\n`;
        plan.forEach((step, i) => {
          md += `${i + 1}. ${step}\n`;
        });
        md += "\n";
      }

      if (subtasks && subtasks.length > 0) {
        md += `## Subtasks\n\n`;
        md += `| # | Description | Status |\n`;
        md += `|---|-------------|--------|\n`;
        subtasks.forEach((st, i) => {
          md += `| ${i + 1} | ${st} | Pending |\n`;
        });
        md += "\n";
      }

      md += `## Progress Log\n\n### ${today}\nTask created.\n`;

      fs.writeFileSync(filePath, md);

      // Sync to in-memory index
      const store = getStore();
      reindexFile(store, filePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Task created: **${taskId}**: ${title}\nFile: ${fileName}\nStatus: Pending`,
          },
        ],
      };
    },
  );
}
