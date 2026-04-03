import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStore } from "../index-store.js";

export function registerMemoryStatus(server: McpServer): void {
  server.tool(
    "memory_status",
    "Returns computed project status: task counts by status, decision counts by status, and top tags.",
    {},
    async () => {
      const store = getStore();

      const taskCounts: Record<string, number> = {};
      const decisionCounts: Record<string, number> = {};
      let coreCount = 0;

      for (const item of store.items.values()) {
        switch (item.type) {
          case "task": {
            const status = item.status || "Unknown";
            taskCounts[status] = (taskCounts[status] || 0) + 1;
            break;
          }
          case "decision": {
            const status = item.status || "Unknown";
            decisionCounts[status] = (decisionCounts[status] || 0) + 1;
            break;
          }
          case "core":
            coreCount++;
            break;
        }
      }

      // Build tag cloud (top 20)
      const tagEntries = Array.from(store.tags.entries())
        .map(([tag, ids]) => ({ tag, count: ids.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      let output = "# Project Status\n\n";

      output += `**Total items:** ${store.items.size} (${coreCount} core, ${Object.values(taskCounts).reduce((a, b) => a + b, 0)} tasks, ${Object.values(decisionCounts).reduce((a, b) => a + b, 0)} decisions)\n\n`;

      if (Object.keys(taskCounts).length > 0) {
        output += "## Tasks\n";
        for (const [status, count] of Object.entries(taskCounts).sort()) {
          output += `- ${status}: ${count}\n`;
        }
        output += "\n";
      }

      if (Object.keys(decisionCounts).length > 0) {
        output += "## Decisions\n";
        for (const [status, count] of Object.entries(decisionCounts).sort()) {
          output += `- ${status}: ${count}\n`;
        }
        output += "\n";
      }

      if (tagEntries.length > 0) {
        output += "## Top Tags\n";
        for (const { tag, count } of tagEntries) {
          output += `- #${tag} (${count})\n`;
        }
        output += "\n";
      }

      output += `**Links:** ${Array.from(store.outgoing.values()).reduce((sum, links) => sum + links.length, 0)} relationships\n`;

      return {
        content: [{ type: "text" as const, text: output }],
      };
    },
  );
}
