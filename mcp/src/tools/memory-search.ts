import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";
import type { SearchResult } from "../types.js";

export function registerMemorySearch(server: McpServer): void {
  server.tool(
    "memory_search",
    "Full-text search across all memory bank content using FTS5. Returns matching items with highlighted excerpts (>>> / <<<). Use this for keyword/phrase searches. For filtering by status or date, use memory_query instead.",
    {
      query: z.string().describe("FTS5 query string. Examples: 'authentication', 'oauth AND google', 'deploy*', 'NOT deprecated'. Supports AND, OR, NOT, prefix*, \"exact phrase\". Case-insensitive."),
      type: z.enum(["core", "task", "decision"]).optional().describe("Filter by item type: 'core' (context files), 'task' (TASK-NNN), 'decision' (ADR-NNNN)"),
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
              text: `Search error: ${err instanceof Error ? err.message : String(err)}. Check FTS5 syntax — use AND/OR/NOT between terms, prefix* for wildcards, "double quotes" for exact phrases.`,
            },
          ],
        };
      }
    },
  );
}
