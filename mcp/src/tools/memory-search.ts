import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";
import type { SearchResult } from "../types.js";

export function registerMemorySearch(server: McpServer): void {
  server.tool(
    "memory_search",
    "Full-text search across all memory bank content. Returns matching items with highlighted excerpts.",
    {
      query: z.string().describe("Search query (supports FTS5 syntax: AND, OR, NOT, prefix*)"),
      type: z.enum(["core", "task", "decision"]).optional().describe("Filter by item type"),
      limit: z.number().min(1).max(50).optional().describe("Maximum results (default 10)"),
    },
    async ({ query, type, limit }) => {
      const db = getDb();
      const maxResults = limit ?? 10;

      let sql = `
        SELECT
          items_fts.id,
          items_fts.title,
          items_fts.type,
          snippet(items_fts, 2, '>>>', '<<<', '...', 32) as excerpt
        FROM items_fts
        WHERE items_fts MATCH @query
      `;

      const params: Record<string, string | number> = { query };

      if (type) {
        sql += ` AND items_fts.type = @type`;
        params.type = type;
      }

      sql += ` ORDER BY rank LIMIT @limit`;
      params.limit = maxResults;

      try {
        const results = db.prepare(sql).all(params) as SearchResult[];

        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No results found for: "${query}"` }],
          };
        }

        const output = results
          .map((r) => `**${r.id}** (${r.type}) — ${r.title}\n${r.excerpt}`)
          .join("\n\n---\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${results.length} result(s) for "${query}":\n\n${output}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Search error: ${err instanceof Error ? err.message : String(err)}. Try simpler query syntax.`,
            },
          ],
        };
      }
    },
  );
}
