import { z } from "zod";
import { getDb } from "../db.js";
export function registerMemoryUnlink(server) {
    server.tool("memory_unlink", "Delete a relationship between two memory bank items. Removes the link matching the exact source, target, and relation triple. Use memory_graph to find existing links before deleting.", {
        source: z.string().describe("Source item ID (e.g. 'TASK-001', 'ADR-0002')."),
        target: z.string().describe("Target item ID (e.g. 'ADR-0001', 'projectbrief')."),
        relation: z.string().describe("Relationship type to delete (e.g. 'implements', 'depends-on'). Must match exactly."),
    }, async ({ source, target, relation }) => {
        const db = getDb();
        const result = db
            .prepare("DELETE FROM links WHERE source_id = @source AND target_id = @target AND relation = @relation")
            .run({ source, target, relation });
        if (result.changes === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No link found: ${source} —[${relation}]→ ${target}. Use memory_graph to inspect existing links.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Link deleted: ${source} —[${relation}]→ ${target}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-unlink.js.map