import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";

export function registerMemoryLink(server: McpServer): void {
  server.tool(
    "memory_link",
    "Create a typed relationship between two memory bank items. Use for connecting decisions to tasks, tasks to patterns, etc.",
    {
      source: z.string().describe("Source item ID (e.g. 'TASK-001', 'ADR-0001', 'projectbrief')"),
      target: z.string().describe("Target item ID"),
      relation: z.string().describe("Relationship type (e.g. 'implements', 'supersedes', 'blocks', 'depends-on', 'references')"),
    },
    async ({ source, target, relation }) => {
      const db = getDb();

      // Validate both items exist
      const sourceItem = db.prepare("SELECT id, title FROM items WHERE id = ?").get(source) as { id: string; title: string } | undefined;
      const targetItem = db.prepare("SELECT id, title FROM items WHERE id = ?").get(target) as { id: string; title: string } | undefined;

      if (!sourceItem) {
        return {
          content: [{ type: "text" as const, text: `Source item not found: "${source}". Use memory_query to list available items.` }],
        };
      }

      if (!targetItem) {
        return {
          content: [{ type: "text" as const, text: `Target item not found: "${target}". Use memory_query to list available items.` }],
        };
      }

      const now = new Date().toISOString();

      try {
        db.prepare(
          "INSERT INTO links (source_id, target_id, relation, created_at) VALUES (@source_id, @target_id, @relation, @created_at)",
        ).run({
          source_id: source,
          target_id: target,
          relation,
          created_at: now,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Link created: **${sourceItem.title}** (${source}) —[${relation}]→ **${targetItem.title}** (${target})`,
            },
          ],
        };
      } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE")) {
          return {
            content: [{ type: "text" as const, text: `Link already exists: ${source} —[${relation}]→ ${target}` }],
          };
        }
        throw err;
      }
    },
  );
}
