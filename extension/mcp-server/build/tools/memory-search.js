import { z } from "zod";
import { getStore, generateExcerpt } from "../index-store.js";
export function registerMemorySearch(server) {
    server.tool("memory_search", "Full-text search across all memory bank content using MiniSearch. Returns matching items with highlighted excerpts (>>> / <<<). Use this for keyword/phrase searches. For filtering by status or date, use memory_query instead.", {
        query: z.string().describe("Search query string. Examples: 'authentication', 'oauth google', 'deploy'. Supports prefix matching (auto-enabled), fuzzy matching, and multi-term search. Case-insensitive."),
        type: z.enum(["core", "task", "decision", "note", "structure"]).optional().describe("Filter by item type: 'core' (context files), 'task' (TASK-NNN), 'decision' (ADR-NNNN), 'note' (NOTE-NNN)"),
        limit: z.number().min(1).max(50).optional().describe("Maximum results (default 10)"),
    }, async ({ query, type, limit }) => {
        const store = getStore();
        const maxResults = limit ?? 10;
        try {
            let results = store.search.search(query, {
                boost: { title: 3 },
                fuzzy: 0.2,
                prefix: true,
            });
            // Filter by type if specified
            if (type) {
                results = results.filter((r) => r.type === type);
            }
            // Limit results
            results = results.slice(0, maxResults);
            if (results.length === 0) {
                return {
                    content: [{ type: "text", text: `No results found for: "${query}"` }],
                };
            }
            const output = results
                .map((r) => {
                const item = store.items.get(r.id);
                const excerpt = item ? generateExcerpt(item.content, query) : "";
                return `**${r.id}** (${r.type}) — ${r.title}\n${excerpt}`;
            })
                .join("\n\n---\n\n");
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${results.length} result(s) for "${query}":\n\n${output}`,
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Search error: ${err instanceof Error ? err.message : String(err)}.`,
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=memory-search.js.map