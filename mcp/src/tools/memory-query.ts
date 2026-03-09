import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";
import type { QueryResult } from "../types.js";

export function registerMemoryQuery(server: McpServer): void {
  server.tool(
    "memory_query",
    "Structured query of memory bank items by type, status, or date range. Returns matching items with metadata.",
    {
      type: z.enum(["core", "task", "decision"]).optional().describe("Filter by item type"),
      status: z.string().optional().describe("Filter by status (e.g. 'Completed', 'Accepted', 'In Progress')"),
      since: z.string().optional().describe("Items updated on or after this date (ISO format: YYYY-MM-DD)"),
      until: z.string().optional().describe("Items updated on or before this date (ISO format: YYYY-MM-DD)"),
      limit: z.number().min(1).max(100).optional().describe("Maximum results (default 20)"),
    },
    async ({ type, status, since, until, limit }) => {
      const db = getDb();
      const maxResults = limit ?? 20;

      const conditions: string[] = [];
      const params: Record<string, string | number> = {};

      if (type) {
        conditions.push("type = @type");
        params.type = type;
      }

      if (status) {
        conditions.push("status = @status");
        params.status = status;
      }

      if (since) {
        conditions.push("(updated_at >= @since OR created_at >= @since)");
        params.since = since;
      }

      if (until) {
        conditions.push("(updated_at <= @until OR created_at <= @until)");
        params.until = until;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const sql = `
        SELECT id, title, type, status, updated_at
        FROM items
        ${where}
        ORDER BY COALESCE(updated_at, created_at, synced_at) DESC
        LIMIT @limit
      `;
      params.limit = maxResults;

      const results = db.prepare(sql).all(params) as QueryResult[];

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No items match the query." }],
        };
      }

      const output = results
        .map((r) => {
          const parts = [`**${r.id}** (${r.type}) — ${r.title}`];
          if (r.status) parts.push(`Status: ${r.status}`);
          if (r.updated_at) parts.push(`Updated: ${r.updated_at}`);
          return parts.join(" | ");
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${results.length} item(s):\n\n${output}`,
          },
        ],
      };
    },
  );
}
