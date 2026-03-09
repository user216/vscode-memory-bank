import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";

const CHARS_PER_TOKEN = 3.5;

interface ItemRow {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
}

// Priority order for "foundational" strategy
const FOUNDATIONAL_ORDER = [
  "projectbrief",
  "productContext",
  "systemPatterns",
  "techContext",
  "activeContext",
  "progress",
];

export function registerMemoryRecall(server: McpServer): void {
  server.tool(
    "memory_recall",
    "Token-budgeted context retrieval. Returns memory bank content prioritized by strategy, fitting within a token budget. Use at session start to load context efficiently.",
    {
      budget: z.number().min(500).max(100000).optional().describe("Token budget (default 8000). Content is trimmed to fit."),
      priority: z.enum(["foundational", "recent", "active"]).optional().describe(
        "Priority strategy: 'foundational' (project overview first), 'recent' (most recently updated first), 'active' (current context + in-progress tasks first). Default: 'active'",
      ),
    },
    async ({ budget, priority }) => {
      const db = getDb();
      const tokenBudget = budget ?? 8000;
      const strategy = priority ?? "active";

      const items = getOrderedItems(db, strategy);

      let totalTokens = 0;
      const sections: string[] = [];

      for (const item of items) {
        const header = `## ${item.id} (${item.type})${item.status ? ` [${item.status}]` : ""}\n`;
        const section = header + item.content;
        const sectionTokens = Math.ceil(section.length / CHARS_PER_TOKEN);

        if (totalTokens + sectionTokens > tokenBudget) {
          // Try to fit a truncated version
          const remainingTokens = tokenBudget - totalTokens;
          if (remainingTokens > 100) {
            const truncatedLen = Math.floor(remainingTokens * CHARS_PER_TOKEN);
            sections.push(header + item.content.slice(0, truncatedLen) + "\n\n...(truncated)");
            totalTokens = tokenBudget;
          }
          break;
        }

        sections.push(section);
        totalTokens += sectionTokens;
      }

      const output = sections.join("\n\n---\n\n");
      const summary = `Recalled ${sections.length} items (~${totalTokens} tokens, budget: ${tokenBudget}, strategy: ${strategy})`;

      return {
        content: [
          {
            type: "text" as const,
            text: `${summary}\n\n${output}`,
          },
        ],
      };
    },
  );
}

function getOrderedItems(db: ReturnType<typeof getDb>, strategy: string): ItemRow[] {
  switch (strategy) {
    case "foundational": {
      const all = db.prepare("SELECT id, type, title, content, status, updated_at, created_at FROM items").all() as ItemRow[];
      // Sort: core files in FOUNDATIONAL_ORDER first, then tasks, then decisions
      return all.sort((a, b) => {
        const aIdx = FOUNDATIONAL_ORDER.indexOf(a.id);
        const bIdx = FOUNDATIONAL_ORDER.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        if (a.type === "task" && b.type === "decision") return -1;
        if (a.type === "decision" && b.type === "task") return 1;
        return 0;
      });
    }

    case "recent": {
      return db.prepare(
        "SELECT id, type, title, content, status, updated_at, created_at FROM items ORDER BY COALESCE(updated_at, created_at, synced_at) DESC",
      ).all() as ItemRow[];
    }

    case "active":
    default: {
      const all = db.prepare("SELECT id, type, title, content, status, updated_at, created_at FROM items").all() as ItemRow[];
      // activeContext first, then in-progress tasks, then recent decisions, then everything else
      return all.sort((a, b) => {
        const aPriority = getActivePriority(a);
        const bPriority = getActivePriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;
        // Within same priority, sort by update date
        const aDate = a.updated_at || a.created_at || "";
        const bDate = b.updated_at || b.created_at || "";
        return bDate.localeCompare(aDate);
      });
    }
  }
}

function getActivePriority(item: ItemRow): number {
  if (item.id === "activeContext") return 0;
  if (item.id === "progress") return 1;
  if (item.type === "task" && item.status === "In Progress") return 2;
  if (item.type === "decision" && item.status === "Proposed") return 3;
  if (item.id === "projectbrief") return 4;
  if (item.type === "core") return 5;
  if (item.type === "task") return 6;
  return 7;
}
