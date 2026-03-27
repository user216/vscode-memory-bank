import { z } from "zod";
import { getStore, addLinkToStore } from "../index-store.js";
export function registerMemoryLink(server) {
    server.tool("memory_link", "Create a typed, directional relationship between two memory bank items. Links are directional: source —[relation]→ target (e.g. TASK-001 —[implements]→ ADR-0001 means the task implements the decision). Use memory_graph to visualize connections after creating links.", {
        source: z.string().describe("Source item ID — the item that performs the action (e.g. 'TASK-001', 'ADR-0002'). Read as: source [relation] target."),
        target: z.string().describe("Target item ID — the item being acted upon (e.g. 'ADR-0001', 'projectbrief'). Both source and target must exist — use memory_query to list available IDs."),
        relation: z.string().describe("Relationship type describing how source relates to target. Common: 'implements' (task→decision), 'supersedes' (new→old), 'blocks', 'depends-on', 'references'. Free-form string."),
    }, async ({ source, target, relation }) => {
        const store = getStore();
        const sourceItem = store.items.get(source);
        const targetItem = store.items.get(target);
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
        const added = addLinkToStore(store, source, target, relation);
        if (!added) {
            return {
                content: [{ type: "text", text: `Link already exists: ${source} —[${relation}]→ ${target}` }],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Link created: **${sourceItem.title}** (${source}) —[${relation}]→ **${targetItem.title}** (${target})`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-link.js.map