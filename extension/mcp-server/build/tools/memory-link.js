import { z } from "zod";
import { getDb } from "../db.js";
export function registerMemoryLink(server) {
    server.tool("memory_link", "Create a typed, directional relationship between two memory bank items. Links are directional: source —[relation]→ target (e.g. TASK-001 —[implements]→ ADR-0001 means the task implements the decision). Use memory_graph to visualize connections after creating links.", {
        source: z.string().describe("Source item ID — the item that performs the action (e.g. 'TASK-001', 'ADR-0002'). Read as: source [relation] target."),
        target: z.string().describe("Target item ID — the item being acted upon (e.g. 'ADR-0001', 'projectbrief'). Both source and target must exist — use memory_query to list available IDs."),
        relation: z.string().describe("Relationship type describing how source relates to target. Common: 'implements' (task→decision), 'supersedes' (new→old), 'blocks', 'depends-on', 'references'. Free-form string."),
    }, async ({ source, target, relation }) => {
        const db = getDb();
        // Validate both items exist
        const sourceItem = db.prepare("SELECT id, title FROM items WHERE id = ?").get(source);
        const targetItem = db.prepare("SELECT id, title FROM items WHERE id = ?").get(target);
        if (!sourceItem) {
            return {
                content: [{ type: "text", text: `Source item not found: "${source}". Use memory_query to list available items.` }],
            };
        }
        if (!targetItem) {
            return {
                content: [{ type: "text", text: `Target item not found: "${target}". Use memory_query to list available items.` }],
            };
        }
        const now = new Date().toISOString();
        try {
            db.prepare("INSERT INTO links (source_id, target_id, relation, created_at) VALUES (@source_id, @target_id, @relation, @created_at)").run({
                source_id: source,
                target_id: target,
                relation,
                created_at: now,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Link created: **${sourceItem.title}** (${source}) —[${relation}]→ **${targetItem.title}** (${target})`,
                    },
                ],
            };
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("UNIQUE")) {
                return {
                    content: [{ type: "text", text: `Link already exists: ${source} —[${relation}]→ ${target}` }],
                };
            }
            throw err;
        }
    });
}
//# sourceMappingURL=memory-link.js.map