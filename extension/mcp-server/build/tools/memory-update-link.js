import { z } from "zod";
import { getDb } from "../db.js";
export function registerMemoryUpdateLink(server) {
    server.tool("memory_update_link", "Update the relation type of an existing link between two memory bank items. Finds the link by source, target, and old relation, then changes the relation to the new value. Use memory_graph to find existing links before updating.", {
        source: z.string().describe("Source item ID (e.g. 'TASK-001', 'ADR-0002')."),
        target: z.string().describe("Target item ID (e.g. 'ADR-0001', 'projectbrief')."),
        old_relation: z.string().describe("Current relationship type to change (e.g. 'references')."),
        new_relation: z.string().describe("New relationship type (e.g. 'implements'). Must differ from old_relation."),
    }, async ({ source, target, old_relation, new_relation }) => {
        if (old_relation === new_relation) {
            return {
                content: [
                    {
                        type: "text",
                        text: `old_relation and new_relation are the same ("${old_relation}"). Nothing to update.`,
                    },
                ],
            };
        }
        const db = getDb();
        // Check if target relation already exists (would violate unique constraint)
        const existing = db
            .prepare("SELECT 1 FROM links WHERE source_id = @source AND target_id = @target AND relation = @new_relation")
            .get({ source, target, new_relation });
        if (existing) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Cannot update: a link ${source} —[${new_relation}]→ ${target} already exists. Delete it first with memory_unlink if needed.`,
                    },
                ],
            };
        }
        const result = db
            .prepare("UPDATE links SET relation = @new_relation WHERE source_id = @source AND target_id = @target AND relation = @old_relation")
            .run({ source, target, old_relation, new_relation });
        if (result.changes === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No link found: ${source} —[${old_relation}]→ ${target}. Use memory_graph to inspect existing links.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Link updated: ${source} —[~~${old_relation}~~ → ${new_relation}]→ ${target}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-update-link.js.map