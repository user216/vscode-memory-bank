import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStore } from "../index-store.js";
import type { GraphNode, GraphEdge } from "../types.js";

export function registerMemoryGraph(server: McpServer): void {
  server.tool(
    "memory_graph",
    "Traverse the knowledge graph from a starting item. Shows connected items and their relationships up to a specified depth. Use after memory_link to visualize connections. Output shows nodes and directed edges (source —[relation]→ target).",
    {
      item: z.string().describe("Starting item ID (e.g. 'TASK-001', 'ADR-0001', 'activeContext', 'projectbrief'). Must be an existing item — use memory_query to list available IDs."),
      depth: z.number().min(1).max(5).optional().describe("Traversal depth (default 1, max 5). Depth 1 = direct connections only, depth 2 = connections of connections, etc."),
      direction: z.enum(["outgoing", "incoming", "both"]).optional().describe("Traversal direction (default 'both'). 'outgoing' = items this links TO (source→target), 'incoming' = items linking TO this (target←source), 'both' = all connections."),
    },
    async ({ item, depth, direction }) => {
      const store = getStore();
      const maxDepth = depth ?? 1;
      const dir = direction ?? "both";

      // Verify starting item exists
      const startItem = store.items.get(item);
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
        type: startItem.type,
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.currentDepth >= maxDepth) continue;

        // Get outgoing links
        if (dir !== "incoming") {
          const outLinks = store.outgoing.get(current.id) || [];
          for (const link of outLinks) {
            edges.push({ source: current.id, target: link.target, relation: link.relation });
            if (!visitedNodes.has(link.target)) {
              const neighbor = store.items.get(link.target);
              if (neighbor) {
                visitedNodes.set(neighbor.id, { id: neighbor.id, title: neighbor.title, type: neighbor.type });
                queue.push({ id: link.target, currentDepth: current.currentDepth + 1 });
              }
            }
          }
        }

        // Get incoming links
        if (dir !== "outgoing") {
          const inLinks = store.incoming.get(current.id) || [];
          for (const link of inLinks) {
            edges.push({ source: link.source, target: current.id, relation: link.relation });
            if (!visitedNodes.has(link.source)) {
              const neighbor = store.items.get(link.source);
              if (neighbor) {
                visitedNodes.set(neighbor.id, { id: neighbor.id, title: neighbor.title, type: neighbor.type });
                queue.push({ id: link.source, currentDepth: current.currentDepth + 1 });
              }
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
