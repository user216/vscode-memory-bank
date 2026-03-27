import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStore, removeLinkFromStore, addLinkToStore } from "../index-store.js";

export function registerMemoryUpdateLink(server: McpServer): void {
  server.tool(
    "memory_update_link",
    "Update the relation type of an existing link between two memory bank items. Finds the link by source, target, and old relation, then changes the relation to the new value. Use memory_graph to find existing links before updating.",
    {
      source: z.string().describe("Source item ID (e.g. 'TASK-001', 'ADR-0002')."),
      target: z.string().describe("Target item ID (e.g. 'ADR-0001', 'projectbrief')."),
      old_relation: z.string().describe("Current relationship type to change (e.g. 'references')."),
      new_relation: z.string().describe("New relationship type (e.g. 'implements'). Must differ from old_relation."),
    },
    async ({ source, target, old_relation, new_relation }) => {
      if (old_relation === new_relation) {
        return {
          content: [
            {
              type: "text" as const,
              text: `old_relation and new_relation are the same ("${old_relation}"). Nothing to update.`,
            },
          ],
        };
      }

      const store = getStore();

      // Check if target relation already exists
      const outLinks = store.outgoing.get(source) || [];
      if (outLinks.some((l) => l.target === target && l.relation === new_relation)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Cannot update: a link ${source} —[${new_relation}]→ ${target} already exists. Delete it first with memory_unlink if needed.`,
            },
          ],
        };
      }

      // Remove old link
      const removed = removeLinkFromStore(store, source, target, old_relation);

      if (!removed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No link found: ${source} —[${old_relation}]→ ${target}. Use memory_graph to inspect existing links.`,
            },
          ],
        };
      }

      // Add new link
      addLinkToStore(store, source, target, new_relation);

      return {
        content: [
          {
            type: "text" as const,
            text: `Link updated: ${source} —[~~${old_relation}~~ → ${new_relation}]→ ${target}`,
          },
        ],
      };
    },
  );
}
