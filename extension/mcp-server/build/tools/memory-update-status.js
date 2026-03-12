import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDb } from "../db.js";
import { syncSingleFile } from "../sync.js";
import { getMemoryBankPath, updateDecisionIndex, updateTaskIndex, TASK_STATUSES, DECISION_STATUSES } from "./shared-utils.js";
const ALL_STATUSES = [...TASK_STATUSES, ...DECISION_STATUSES];
export function registerMemoryUpdateStatus(server) {
    server.tool("memory_update_status", "Update the status of a task or decision in the memory bank. Validates status values against item type, updates the markdown file, regenerates the index, and syncs to SQLite. Optionally appends a timestamped progress log entry.", {
        id: z
            .string()
            .describe("Item ID to update (e.g. 'TASK-001', 'ADR-0001'). Must exist — use memory_query to find IDs."),
        status: z
            .string()
            .describe("New status (case-sensitive). Tasks: 'Pending', 'In Progress', 'Completed', 'Abandoned'. Decisions: 'Proposed', 'Accepted', 'Deprecated', 'Superseded', 'Rejected'."),
        log_entry: z
            .string()
            .optional()
            .describe("Progress log entry to append with today's date (optional). E.g. 'Completed migration, all tests passing.'"),
    }, async ({ id, status, log_entry }) => {
        const mbPath = getMemoryBankPath();
        const db = getDb();
        // Validate status
        if (!ALL_STATUSES.includes(status)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Invalid status: "${status}". Valid values:\n- Tasks: ${TASK_STATUSES.join(", ")}\n- Decisions: ${DECISION_STATUSES.join(", ")}`,
                    },
                ],
            };
        }
        // Find the item in the database
        const item = db
            .prepare("SELECT id, type, file_path, status FROM items WHERE id = ?")
            .get(id);
        if (!item) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Item not found: "${id}". Use memory_query to list available items.`,
                    },
                ],
            };
        }
        // Validate status matches item type
        if (item.type === "task" &&
            !TASK_STATUSES.includes(status)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Invalid status for task: "${status}". Valid: ${TASK_STATUSES.join(", ")}`,
                    },
                ],
            };
        }
        if (item.type === "decision" &&
            !DECISION_STATUSES.includes(status)) {
            return {
                content: [
                    {
                        type: "text",
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
                        type: "text",
                        text: `File not found: ${item.file_path}. Database may be out of sync.`,
                    },
                ],
            };
        }
        let content = fs.readFileSync(filePath, "utf-8");
        const today = new Date().toISOString().slice(0, 10);
        // Update Status field
        content = content.replace(/(\*\*Status:\*\*\s*).+/, `$1${status}`);
        // Update Updated field
        content = content.replace(/(\*\*Updated:\*\*\s*).+/, `$1${today}`);
        // Append progress log entry if provided
        if (log_entry) {
            if (content.includes("## Progress Log")) {
                // Append after Progress Log heading
                content = content.replace(/(## Progress Log\n)/, `$1\n### ${today}\n${log_entry}\n`);
            }
            else {
                // Add Progress Log section
                content += `\n## Progress Log\n\n### ${today}\n${log_entry}\n`;
            }
        }
        fs.writeFileSync(filePath, content);
        // Update the index
        const parentDir = path.dirname(filePath);
        if (item.type === "task") {
            updateTaskIndex(parentDir);
        }
        else if (item.type === "decision") {
            updateDecisionIndex(parentDir);
        }
        // Sync to SQLite
        syncSingleFile(mbPath, filePath);
        const oldStatus = item.status || "unknown";
        return {
            content: [
                {
                    type: "text",
                    text: `Status updated: **${id}** — ${oldStatus} → ${status}${log_entry ? `\nLog entry added: ${log_entry}` : ""}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-update-status.js.map