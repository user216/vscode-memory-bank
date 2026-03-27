import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStore } from "../index-store.js";
import type { QueryResult } from "../types.js";

export function registerMemoryQuery(server: McpServer): void {
  server.tool(
    "memory_query",
    "Structured query of memory bank items by type, status, or date range. Returns matching items with metadata. All filters combine with AND logic. Call with no parameters to list all items. For keyword search, use memory_search instead.",
    {
      type: z.enum(["core", "task", "decision", "note", "structure"]).optional().describe("Filter by item type: 'core' (context files), 'task' (TASK-NNN), 'decision' (ADR-NNNN), 'note' (NOTE-NNN)"),
      status: z.string().optional().describe("Filter by status (case-sensitive, exact match). Tasks: 'Pending', 'In Progress', 'Completed', 'Abandoned'. Decisions: 'Proposed', 'Accepted', 'Deprecated', 'Superseded', 'Rejected'."),
      since: z.string().optional().describe("Items updated on or after this date (ISO format: YYYY-MM-DD, e.g. '2026-01-15')"),
      until: z.string().optional().describe("Items updated on or before this date (ISO format: YYYY-MM-DD, e.g. '2026-03-01')"),
      limit: z.number().min(1).max(100).optional().describe("Maximum results (default 20)"),
    },
    async ({ type, status, since, until, limit }) => {
      const store = getStore();
      const maxResults = limit ?? 20;

      let items = Array.from(store.items.values());

      // Apply filters
      if (type) {
        items = items.filter((item) => item.type === type);
      }

      if (status) {
        items = items.filter((item) => item.status === status);
      }

      if (since) {
        items = items.filter((item) => {
          const date = item.updatedAt || item.createdAt;
          return date ? date >= since : false;
        });
      }

      if (until) {
        items = items.filter((item) => {
          const date = item.updatedAt || item.createdAt;
          return date ? date <= until : false;
        });
      }

      // Sort by date descending
      items.sort((a, b) => {
        const aDate = a.updatedAt || a.createdAt || "";
        const bDate = b.updatedAt || b.createdAt || "";
        return bDate.localeCompare(aDate);
      });

      // Apply limit
      items = items.slice(0, maxResults);

      if (items.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No items match the query." }],
        };
      }

      const output = items
        .map((r) => {
          const parts = [`**${r.id}** (${r.type}) — ${r.title}`];
          if (r.status) parts.push(`Status: ${r.status}`);
          if (r.updatedAt) parts.push(`Updated: ${r.updatedAt}`);
          return parts.join(" | ");
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${items.length} item(s):\n\n${output}`,
          },
        ],
      };
    },
  );
}
