import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDb } from "../db.js";
import { syncSingleFile } from "../sync.js";

const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Abandoned"] as const;
const DECISION_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"] as const;
const ALL_STATUSES = [...TASK_STATUSES, ...DECISION_STATUSES];

function getMemoryBankPath(): string {
  return (
    process.env.MEMORY_BANK_PATH ||
    path.join(process.cwd(), "memory-bank")
  );
}

function updateIndex(dir: string, type: "tasks" | "decisions"): void {
  const indexPath = path.join(dir, "_index.md");
  const prefix = type === "tasks" ? "TASK-" : "ADR-";
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"));

  const items: Array<{ id: string; title: string; status: string }> = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    const idMatch = f.match(new RegExp(`^(${prefix}\\d{3,4})`));
    if (idMatch) {
      items.push({
        id: idMatch[1],
        title: titleMatch ? titleMatch[1].trim() : idMatch[1],
        status: statusMatch ? statusMatch[1].trim() : "Pending",
      });
    }
  }

  const statusOrder =
    type === "tasks"
      ? ["In Progress", "Pending", "Completed", "Abandoned"]
      : ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];

  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    if (!groups[item.status]) groups[item.status] = [];
    groups[item.status].push(item);
  }

  const heading = type === "tasks" ? "Tasks" : "Decisions";
  let md = `# ${heading}\n\n`;
  for (const status of statusOrder) {
    const group = groups[status];
    if (!group || group.length === 0) continue;
    md += `## ${status}\n\n`;
    for (const item of group) {
      md += `- **${item.id}**: ${item.title}\n`;
    }
    md += "\n";
  }

  fs.writeFileSync(indexPath, md);
}

export function registerMemoryUpdateStatus(server: McpServer): void {
  server.tool(
    "memory_update_status",
    "Update the status of a task or decision in the memory bank. Validates status values against item type, updates the markdown file, regenerates the index, and syncs to SQLite. Optionally appends a timestamped progress log entry.",
    {
      id: z
        .string()
        .describe(
          "Item ID to update (e.g. 'TASK-001', 'ADR-0001'). Must exist — use memory_query to find IDs.",
        ),
      status: z
        .string()
        .describe(
          "New status (case-sensitive). Tasks: 'Pending', 'In Progress', 'Completed', 'Abandoned'. Decisions: 'Proposed', 'Accepted', 'Deprecated', 'Superseded', 'Rejected'.",
        ),
      log_entry: z
        .string()
        .optional()
        .describe("Progress log entry to append with today's date (optional). E.g. 'Completed migration, all tests passing.'"),
    },
    async ({ id, status, log_entry }) => {
      const mbPath = getMemoryBankPath();
      const db = getDb();

      // Validate status
      if (!ALL_STATUSES.includes(status as any)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid status: "${status}". Valid values:\n- Tasks: ${TASK_STATUSES.join(", ")}\n- Decisions: ${DECISION_STATUSES.join(", ")}`,
            },
          ],
        };
      }

      // Find the item in the database
      const item = db
        .prepare("SELECT id, type, file_path, status FROM items WHERE id = ?")
        .get(id) as
        | { id: string; type: string; file_path: string; status: string | null }
        | undefined;

      if (!item) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Item not found: "${id}". Use memory_query to list available items.`,
            },
          ],
        };
      }

      // Validate status matches item type
      if (
        item.type === "task" &&
        !TASK_STATUSES.includes(status as any)
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid status for task: "${status}". Valid: ${TASK_STATUSES.join(", ")}`,
            },
          ],
        };
      }

      if (
        item.type === "decision" &&
        !DECISION_STATUSES.includes(status as any)
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid status for decision: "${status}". Valid: ${DECISION_STATUSES.join(", ")}`,
            },
          ],
        };
      }

      const filePath = path.join(mbPath, item.file_path);
      if (!fs.existsSync(filePath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `File not found: ${item.file_path}. Database may be out of sync.`,
            },
          ],
        };
      }

      let content = fs.readFileSync(filePath, "utf-8");
      const today = new Date().toISOString().slice(0, 10);

      // Update Status field
      content = content.replace(
        /(\*\*Status:\*\*\s*).+/,
        `$1${status}`,
      );

      // Update Updated field
      content = content.replace(
        /(\*\*Updated:\*\*\s*).+/,
        `$1${today}`,
      );

      // Append progress log entry if provided
      if (log_entry) {
        if (content.includes("## Progress Log")) {
          // Append after Progress Log heading
          content = content.replace(
            /(## Progress Log\n)/,
            `$1\n### ${today}\n${log_entry}\n`,
          );
        } else {
          // Add Progress Log section
          content += `\n## Progress Log\n\n### ${today}\n${log_entry}\n`;
        }
      }

      fs.writeFileSync(filePath, content);

      // Update the index
      const parentDir = path.dirname(filePath);
      if (item.type === "task") {
        updateIndex(parentDir, "tasks");
      } else if (item.type === "decision") {
        updateIndex(parentDir, "decisions");
      }

      // Sync to SQLite
      syncSingleFile(mbPath, filePath);

      const oldStatus = item.status || "unknown";
      return {
        content: [
          {
            type: "text" as const,
            text: `Status updated: **${id}** — ${oldStatus} → ${status}${log_entry ? `\nLog entry added: ${log_entry}` : ""}`,
          },
        ],
      };
    },
  );
}
