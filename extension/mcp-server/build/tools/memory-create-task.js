import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { syncSingleFile } from "../sync.js";
import { getMemoryBankPath, slugify, getNextId, updateTaskIndex } from "./shared-utils.js";
export function registerMemoryCreateTask(server) {
    server.tool("memory_create_task", "Create a new task in the memory bank with proper formatting, auto-generated TASK-NNN ID, and index update. Creates a markdown file in memory-bank/tasks/ and syncs to SQLite. Initial status is always Pending — use memory_update_status to change it later.", {
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
    }, async ({ title, request, plan, subtasks }) => {
        const mbPath = getMemoryBankPath();
        const tasksDir = path.join(mbPath, "tasks");
        if (!fs.existsSync(tasksDir)) {
            fs.mkdirSync(tasksDir, { recursive: true });
        }
        const taskId = getNextId(tasksDir, "TASK-", 3);
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
                    type: "text",
                    text: `Task created: **${taskId}**: ${title}\nFile: tasks/${fileName}\nStatus: Pending`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-create-task.js.map