import { z } from "zod";
import { getDb } from "../db.js";
export function registerMemoryQuery(server) {
    server.tool("memory_query", "Structured query of memory bank items by type, status, or date range. Returns matching items with metadata. All filters combine with AND logic. Call with no parameters to list all items. For keyword search, use memory_search instead.", {
        type: z.enum(["core", "task", "decision"]).optional().describe("Filter by item type: 'core' (context files), 'task' (TASK-NNN), 'decision' (ADR-NNNN)"),
        status: z.string().optional().describe("Filter by status (case-sensitive, exact match). Tasks: 'Pending', 'In Progress', 'Completed', 'Abandoned'. Decisions: 'Proposed', 'Accepted', 'Deprecated', 'Superseded', 'Rejected'."),
        since: z.string().optional().describe("Items updated on or after this date (ISO format: YYYY-MM-DD, e.g. '2026-01-15')"),
        until: z.string().optional().describe("Items updated on or before this date (ISO format: YYYY-MM-DD, e.g. '2026-03-01')"),
        limit: z.number().min(1).max(100).optional().describe("Maximum results (default 20)"),
    }, async ({ type, status, since, until, limit }) => {
        const db = getDb();
        const maxResults = limit ?? 20;
        const conditions = [];
        const params = {};
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
        const results = db.prepare(sql).all(params);
        if (results.length === 0) {
            return {
                content: [{ type: "text", text: "No items match the query." }],
            };
        }
        const output = results
            .map((r) => {
            const parts = [`**${r.id}** (${r.type}) — ${r.title}`];
            if (r.status)
                parts.push(`Status: ${r.status}`);
            if (r.updated_at)
                parts.push(`Updated: ${r.updated_at}`);
            return parts.join(" | ");
        })
            .join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${results.length} item(s):\n\n${output}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-query.js.map