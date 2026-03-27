import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStore, removeLinkFromStore } from "../index-store.js";

export function registerMemoryUnlink(server: McpServer): void {
  server.tool(
    "memory_unlink",
    "Delete a relationship between two memory bank items. Removes the link matching the exact source, target, and relation triple. Use memory_graph to find existing links before deleting.",
    {
      source: z.string().describe("Source item ID (e.g. 'TASK-001', 'ADR-0002')."),
      target: z.string().describe("Target item ID (e.g. 'ADR-0001', 'projectbrief')."),
      relation: z.string().describe("Relationship type to delete (e.g. 'implements', 'depends-on'). Must match exactly."),
    },
    async ({ source, target, relation }) => {
      const store = getStore();

      const removed = removeLinkFromStore(store, source, target, relation);

      if (!removed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No link found: ${source} —[${relation}]→ ${target}. Use memory_graph to inspect existing links.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Link deleted: ${source} —[${relation}]→ ${target}`,
          },
        ],
      };
    },
  );
}
