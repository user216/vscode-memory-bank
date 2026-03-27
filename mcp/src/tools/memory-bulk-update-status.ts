import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile } from "../index-store.js";
import { getMemoryBankPath, TASK_STATUSES, DECISION_STATUSES, resolveStatus } from "./shared-utils.js";

const ALL_STATUSES = [...TASK_STATUSES, ...DECISION_STATUSES];

function updateFileStatus(content: string, status: string, today: string): string {
  let result = content;

  // Try YAML frontmatter first
  let statusUpdated = false;
  const fmMatch = result.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/m);
  if (fmMatch) {
    const fmBlock = fmMatch[2];
    const updatedFmBlock = fmBlock.replace(/^(status\s*:\s*).+$/m, `$1${status}`);
    if (updatedFmBlock !== fmBlock) {
      result = result.replace(fmMatch[0], `${fmMatch[1]}${updatedFmBlock}${fmMatch[3]}`);
      statusUpdated = true;
    }
    // Also update 'updated' date in frontmatter
    const fmMatch2 = result.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/m);
    if (fmMatch2) {
      const updatedFm = fmMatch2[2].replace(/^(updated\s*:\s*).+$/m, `$1${today}`);
      if (updatedFm !== fmMatch2[2]) {
        result = result.replace(fmMatch2[0], `${fmMatch2[1]}${updatedFm}${fmMatch2[3]}`);
      }
    }
  }
  if (!statusUpdated && /\*\*Status:\*\*/.test(result)) {
    result = result.replace(/(\*\*Status:\*\*\s*).+/, `$1${status}`);
    statusUpdated = true;
  }
  if (!statusUpdated && /^##\s+Status:/m.test(result)) {
    result = result.replace(/^(##\s+Status:\s*).+$/m, `$1${status}`);
  }

  // Update **Updated:** if present
  result = result.replace(/(\*\*Updated:\*\*\s*).+/, `$1${today}`);

  return result;
}

export function registerMemoryBulkUpdateStatus(server: McpServer): void {
  server.tool(
    "memory_bulk_update_status",
    "Update the status of multiple tasks or decisions in a single call. Each item is validated independently; partial success is reported. Accepts common aliases (Open→Pending, Done→Completed, Draft→Proposed, Approved→Accepted).",
    {
      updates: z
        .array(
          z.object({
            id: z.string().describe("Item ID (e.g. 'TASK-001', 'ADR-0001')"),
            status: z.string().describe("New status value"),
            log_entry: z.string().optional().describe("Optional progress log entry"),
          }),
        )
        .min(1)
        .max(50)
        .describe("Array of status updates to apply"),
    },
    async ({ updates }) => {
      const mbPath = getMemoryBankPath();
      const store = getStore();
      const today = new Date().toISOString().slice(0, 10);
      const successes: string[] = [];
      const failures: string[] = [];

      for (const update of updates) {
        const status = resolveStatus(update.status);

        // Validate status
        if (!ALL_STATUSES.includes(status as any)) {
          failures.push(`${update.id}: invalid status "${update.status}"`);
          continue;
        }

        // Find item
        const item = store.items.get(update.id);
        if (!item) {
          failures.push(`${update.id}: not found`);
          continue;
        }

        // Validate status matches item type
        if (item.type === "task" && !TASK_STATUSES.includes(status as any)) {
          failures.push(`${update.id}: "${status}" is not valid for tasks`);
          continue;
        }
        if (item.type === "decision" && !DECISION_STATUSES.includes(status as any)) {
          failures.push(`${update.id}: "${status}" is not valid for decisions`);
          continue;
        }

        const filePath = path.join(mbPath, item.filePath);
        if (!fs.existsSync(filePath)) {
          failures.push(`${update.id}: file not found`);
          continue;
        }

        let content = fs.readFileSync(filePath, "utf-8");
        const oldStatus = item.status || "unknown";

        content = updateFileStatus(content, status, today);

        // Append log entry if provided
        if (update.log_entry) {
          if (content.includes("## Progress Log")) {
            content = content.replace(
              /(## Progress Log\n)/,
              `$1\n### ${today}\n${update.log_entry}\n`,
            );
          } else {
            content += `\n## Progress Log\n\n### ${today}\n${update.log_entry}\n`;
          }
        }

        fs.writeFileSync(filePath, content);
        reindexFile(store, filePath);
        successes.push(`${update.id}: ${oldStatus} → ${status}`);
      }

      const summary = [
        `Updated ${successes.length}/${updates.length} items.`,
        ...successes.map((s) => `  ${s}`),
      ];
      if (failures.length > 0) {
        summary.push(`\nFailed (${failures.length}):`);
        summary.push(...failures.map((f) => `  ${f}`));
      }

      return {
        content: [{ type: "text" as const, text: summary.join("\n") }],
      };
    },
  );
}
