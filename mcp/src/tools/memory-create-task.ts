import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDb } from "../db.js";
import { syncSingleFile } from "../sync.js";

const VALID_STATUSES = ["Pending", "In Progress", "Completed", "Abandoned"] as const;

function getMemoryBankPath(): string {
  return (
    process.env.MEMORY_BANK_PATH ||
    path.join(process.cwd(), "memory-bank")
  );
}

function getNextTaskId(tasksDir: string): string {
  const files = fs.existsSync(tasksDir)
    ? fs.readdirSync(tasksDir).filter((f) => f.match(/^TASK-\d{3}/))
    : [];

  let maxNum = 0;
  for (const f of files) {
    const m = f.match(/^TASK-(\d{3})/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return `TASK-${String(maxNum + 1).padStart(3, "0")}`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function updateTaskIndex(tasksDir: string): void {
  const indexPath = path.join(tasksDir, "_index.md");
  const files = fs
    .readdirSync(tasksDir)
    .filter((f) => f.match(/^TASK-\d{3}/) && f.endsWith(".md"));

  const tasks: Array<{ id: string; title: string; status: string }> = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(tasksDir, f), "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    const idMatch = f.match(/^(TASK-\d{3})/);
    if (idMatch) {
      tasks.push({
        id: idMatch[1],
        title: titleMatch ? titleMatch[1].trim() : idMatch[1],
        status: statusMatch ? statusMatch[1].trim() : "Pending",
      });
    }
  }

  // Group by status
  const groups: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    if (!groups[t.status]) groups[t.status] = [];
    groups[t.status].push(t);
  }

  let md = "# Tasks\n\n";
  for (const status of ["In Progress", "Pending", "Completed", "Abandoned"]) {
    const group = groups[status];
    if (!group || group.length === 0) continue;
    md += `## ${status}\n\n`;
    for (const t of group) {
      md += `- **${t.id}**: ${t.title}\n`;
    }
    md += "\n";
  }

  fs.writeFileSync(indexPath, md);
}

export function registerMemoryCreateTask(server: McpServer): void {
  server.tool(
    "memory_create_task",
    "Create a new task in the memory bank with proper formatting, auto-generated ID, and index update.",
    {
      title: z.string().describe("Task title (e.g. 'Implement user authentication')"),
      request: z.string().describe("Original request or description of what needs to be done"),
      plan: z
        .array(z.string())
        .optional()
        .describe("Implementation plan steps (optional)"),
      subtasks: z
        .array(z.string())
        .optional()
        .describe("Subtask descriptions for progress tracking (optional)"),
    },
    async ({ title, request, plan, subtasks }) => {
      const mbPath = getMemoryBankPath();
      const tasksDir = path.join(mbPath, "tasks");

      if (!fs.existsSync(tasksDir)) {
        fs.mkdirSync(tasksDir, { recursive: true });
      }

      const taskId = getNextTaskId(tasksDir);
      const slug = slugify(title);
      const fileName = `${taskId}-${slug}.md`;
      const filePath = path.join(tasksDir, fileName);
      const today = new Date().toISOString().slice(0, 10);

      let md = `# ${taskId}: ${title}\n\n`;
      md += `**Status:** Pending\n`;
      md += `**Added:** ${today}\n`;
      md += `**Updated:** ${today}\n\n`;
      md += `## Original Request\n${request}\n\n`;

      if (plan && plan.length > 0) {
        md += `## Implementation Plan\n`;
        plan.forEach((step, i) => {
          md += `${i + 1}. ${step}\n`;
        });
        md += "\n";
      }

      if (subtasks && subtasks.length > 0) {
        md += `## Progress Tracking\n\n`;
        md += `| ID | Description | Status | Updated | Notes |\n`;
        md += `|----|-------------|--------|---------|-------|\n`;
        subtasks.forEach((st, i) => {
          md += `| ${i + 1}.1 | ${st} | Pending | | |\n`;
        });
        md += "\n";
      }

      md += `## Progress Log\n\n### ${today}\nTask created.\n`;

      fs.writeFileSync(filePath, md);
      updateTaskIndex(tasksDir);

      // Sync to SQLite
      syncSingleFile(mbPath, filePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Task created: **${taskId}**: ${title}\nFile: tasks/${fileName}\nStatus: Pending`,
          },
        ],
      };
    },
  );
}
