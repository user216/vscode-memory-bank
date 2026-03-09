import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";
import type { GraphNode, GraphEdge } from "../types.js";

interface ItemRow {
  id: string;
  title: string;
  type: string;
}

interface LinkRow {
  source_id: string;
  target_id: string;
  relation: string;
}

export function registerMemoryGraph(server: McpServer): void {
  server.tool(
    "memory_graph",
    "Traverse the knowledge graph from a starting item. Shows connected items and their relationships up to a specified depth.",
    {
      item: z.string().describe("Starting item ID (e.g. 'TASK-001', 'ADR-0001', 'activeContext')"),
      depth: z.number().min(1).max(5).optional().describe("Traversal depth (default 1, max 5)"),
      direction: z.enum(["outgoing", "incoming", "both"]).optional().describe("Traversal direction (default 'both')"),
    },
    async ({ item, depth, direction }) => {
      const db = getDb();
      const maxDepth = depth ?? 1;
      const dir = direction ?? "both";

      // Verify starting item exists
      const startItem = db.prepare("SELECT id, title, type FROM items WHERE id = ?").get(item) as ItemRow | undefined;
      if (!startItem) {
        return {
          content: [{ type: "text" as const, text: `Item not found: "${item}". Use memory_query to list available items.` }],
        };
      }

      const visitedNodes = new Map<string, GraphNode>();
      const edges: GraphEdge[] = [];
      const queue: Array<{ id: string; currentDepth: number }> = [{ id: item, currentDepth: 0 }];

      visitedNodes.set(startItem.id, {
        id: startItem.id,
        title: startItem.title,
        type: startItem.type as GraphNode["type"],
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.currentDepth >= maxDepth) continue;

        const links = getLinks(db, current.id, dir);

        for (const link of links) {
          const neighborId = link.source_id === current.id ? link.target_id : link.source_id;

          edges.push({
            source: link.source_id,
            target: link.target_id,
            relation: link.relation,
          });

          if (!visitedNodes.has(neighborId)) {
            const neighborItem = db.prepare("SELECT id, title, type FROM items WHERE id = ?").get(neighborId) as ItemRow | undefined;
            if (neighborItem) {
              visitedNodes.set(neighborItem.id, {
                id: neighborItem.id,
                title: neighborItem.title,
                type: neighborItem.type as GraphNode["type"],
              });
              queue.push({ id: neighborId, currentDepth: current.currentDepth + 1 });
            }
          }
        }
      }

      if (edges.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No connections found for "${item}" (${startItem.title}). Use memory_link to create relationships.`,
            },
          ],
        };
      }

      // Format output
      const nodesSection = Array.from(visitedNodes.values())
        .map((n) => `- **${n.id}** (${n.type}) — ${n.title}`)
        .join("\n");

      // Deduplicate edges
      const edgeKeys = new Set<string>();
      const uniqueEdges = edges.filter((e) => {
        const key = `${e.source}-${e.relation}-${e.target}`;
        if (edgeKeys.has(key)) return false;
        edgeKeys.add(key);
        return true;
      });

      const edgesSection = uniqueEdges
        .map((e) => `- ${e.source} —[${e.relation}]→ ${e.target}`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Graph for "${item}" (depth: ${maxDepth}, direction: ${dir}):\n\n### Nodes (${visitedNodes.size})\n${nodesSection}\n\n### Edges (${uniqueEdges.length})\n${edgesSection}`,
          },
        ],
      };
    },
  );
}

function getLinks(db: ReturnType<typeof getDb>, itemId: string, direction: string): LinkRow[] {
  switch (direction) {
    case "outgoing":
      return db.prepare("SELECT source_id, target_id, relation FROM links WHERE source_id = ?").all(itemId) as LinkRow[];
    case "incoming":
      return db.prepare("SELECT source_id, target_id, relation FROM links WHERE target_id = ?").all(itemId) as LinkRow[];
    case "both":
    default:
      return db.prepare("SELECT source_id, target_id, relation FROM links WHERE source_id = ? OR target_id = ?").all(itemId, itemId) as LinkRow[];
  }
}
