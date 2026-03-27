import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStore } from "../index-store.js";

export function registerMemoryTags(server: McpServer): void {
  server.tool(
    "memory_tags",
    "List all tags with item counts, or list all items with a specific tag. Tags come from YAML frontmatter and inline #hashtags.",
    {
      tag: z
        .string()
        .optional()
        .describe("Filter by specific tag (without #). If omitted, lists all tags with counts."),
    },
    async ({ tag }) => {
      const store = getStore();

      if (tag) {
        // List items with this specific tag
        const itemIds = store.tags.get(tag);
        if (!itemIds || itemIds.size === 0) {
          return {
            content: [{ type: "text" as const, text: `No items found with tag #${tag}` }],
          };
        }

        const items = Array.from(itemIds)
          .map((id) => store.items.get(id))
          .filter(Boolean)
          .map((item) => `- **${item!.id}** (${item!.type}) — ${item!.title}${item!.status ? ` [${item!.status}]` : ""}`);

        return {
          content: [
            {
              type: "text" as const,
              text: `Items tagged #${tag} (${items.length}):\n${items.join("\n")}`,
            },
          ],
        };
      }

      // List all tags
      if (store.tags.size === 0) {
        return {
          content: [{ type: "text" as const, text: "No tags found. Add tags via YAML frontmatter or inline #hashtags." }],
        };
      }

      const tagList = Array.from(store.tags.entries())
        .map(([t, ids]) => ({ tag: t, count: ids.size }))
        .sort((a, b) => b.count - a.count)
        .map(({ tag: t, count }) => `- #${t} (${count} items)`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Tags (${store.tags.size}):\n${tagList}`,
          },
        ],
      };
    },
  );
}
