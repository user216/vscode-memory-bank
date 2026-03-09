import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { syncSingleFile } from "../sync.js";

function getMemoryBankPath(): string {
  return (
    process.env.MEMORY_BANK_PATH ||
    path.join(process.cwd(), "memory-bank")
  );
}

export function registerMemorySaveContext(server: McpServer): void {
  server.tool(
    "memory_save_context",
    "Save the current active context to activeContext.md with proper structure. Overwrites the file with validated sections.",
    {
      current_focus: z
        .string()
        .describe("One-line summary of what the project is currently focused on"),
      recent_changes: z
        .array(z.string())
        .describe("List of recent changes (each item is a bullet point)"),
      current_decisions: z
        .array(z.string())
        .optional()
        .describe("List of current active decisions (optional, preserved if omitted)"),
      next_steps: z
        .array(z.string())
        .optional()
        .describe("List of next steps (optional)"),
    },
    async ({ current_focus, recent_changes, current_decisions, next_steps }) => {
      const mbPath = getMemoryBankPath();
      const filePath = path.join(mbPath, "activeContext.md");

      // If current_decisions not provided, try to preserve from existing file
      let decisions = current_decisions;
      if (!decisions && fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, "utf-8");
        const decisionsMatch = existing.match(
          /## Current Decisions\n([\s\S]*?)(?=\n## |\n*$)/,
        );
        if (decisionsMatch) {
          decisions = decisionsMatch[1]
            .trim()
            .split("\n")
            .filter((l) => l.startsWith("- "))
            .map((l) => l.replace(/^- /, ""));
        }
      }

      let md = "# Active Context\n\n";
      md += `## Current Focus\n${current_focus}\n\n`;

      md += "## Recent Changes\n";
      for (const change of recent_changes) {
        md += `- ${change}\n`;
      }
      md += "\n";

      if (decisions && decisions.length > 0) {
        md += "## Current Decisions\n";
        for (const d of decisions) {
          md += `- ${d}\n`;
        }
        md += "\n";
      }

      if (next_steps && next_steps.length > 0) {
        md += "## Next Steps\n";
        next_steps.forEach((step, i) => {
          md += `${i + 1}. ${step}\n`;
        });
        md += "\n";
      }

      fs.writeFileSync(filePath, md);

      // Sync to SQLite
      syncSingleFile(mbPath, filePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Active context saved.\n- Focus: ${current_focus}\n- ${recent_changes.length} recent changes\n- ${decisions?.length ?? 0} decisions\n- ${next_steps?.length ?? 0} next steps`,
          },
        ],
      };
    },
  );
}
