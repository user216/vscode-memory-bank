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

function getNextAdrId(decisionsDir: string): string {
  const files = fs.existsSync(decisionsDir)
    ? fs.readdirSync(decisionsDir).filter((f) => f.match(/^ADR-\d{4}/))
    : [];

  let maxNum = 0;
  for (const f of files) {
    const m = f.match(/^ADR-(\d{4})/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return `ADR-${String(maxNum + 1).padStart(4, "0")}`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function updateDecisionIndex(decisionsDir: string): void {
  const indexPath = path.join(decisionsDir, "_index.md");
  const files = fs
    .readdirSync(decisionsDir)
    .filter((f) => f.match(/^ADR-\d{4}/) && f.endsWith(".md"));

  const decisions: Array<{ id: string; title: string; status: string }> = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(decisionsDir, f), "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    const idMatch = f.match(/^(ADR-\d{4})/);
    if (idMatch) {
      decisions.push({
        id: idMatch[1],
        title: titleMatch ? titleMatch[1].trim() : idMatch[1],
        status: statusMatch ? statusMatch[1].trim() : "Proposed",
      });
    }
  }

  // Group by status
  const groups: Record<string, typeof decisions> = {};
  for (const d of decisions) {
    if (!groups[d.status]) groups[d.status] = [];
    groups[d.status].push(d);
  }

  let md = "# Decisions Index\n\n";
  for (const status of ["Proposed", "Accepted", "Deprecated", "Superseded"]) {
    md += `## ${status}\n\n`;
    const group = groups[status];
    if (!group || group.length === 0) {
      md += `_None_\n\n`;
    } else {
      for (const d of group) {
        md += `- **${d.id}**: ${d.title}\n`;
      }
      md += "\n";
    }
  }

  fs.writeFileSync(indexPath, md);
}

export function registerMemoryCreateDecision(server: McpServer): void {
  server.tool(
    "memory_create_decision",
    "Create a new ADR decision in the memory bank with proper formatting, auto-generated ID, and index update.",
    {
      title: z.string().describe("Decision title (e.g. 'Use PostgreSQL for persistence')"),
      context: z.string().describe("Context section — the problem or situation prompting this decision"),
      decision: z.string().describe("Decision section — what was decided"),
      status: z
        .enum(["Proposed", "Accepted", "Deprecated", "Superseded"])
        .optional()
        .default("Proposed")
        .describe("Initial status (default: Proposed)"),
      deciders: z
        .string()
        .optional()
        .default("")
        .describe("Who made or proposed this decision"),
      alternatives: z
        .array(
          z.object({
            name: z.string().describe("Alternative name"),
            description: z.string().describe("Description of the alternative"),
          })
        )
        .optional()
        .describe("Alternatives considered (optional)"),
      consequences: z
        .array(z.string())
        .optional()
        .describe("List of consequences (optional)"),
    },
    async ({ title, context, decision, status, deciders, alternatives, consequences }) => {
      const mbPath = getMemoryBankPath();
      const decisionsDir = path.join(mbPath, "decisions");

      if (!fs.existsSync(decisionsDir)) {
        fs.mkdirSync(decisionsDir, { recursive: true });
      }

      const adrId = getNextAdrId(decisionsDir);
      const slug = slugify(title);
      const fileName = `${adrId}-${slug}.md`;
      const filePath = path.join(decisionsDir, fileName);
      const today = new Date().toISOString().slice(0, 10);

      let md = `# ${adrId}: ${title}\n\n`;
      md += `**Status:** ${status}\n`;
      md += `**Date:** ${today}\n`;
      md += `**Deciders:** ${deciders}\n\n`;
      md += `## Context\n${context}\n\n`;
      md += `## Decision\n${decision}\n\n`;

      md += `## Alternatives Considered\n\n`;
      if (alternatives && alternatives.length > 0) {
        for (const alt of alternatives) {
          md += `### ${alt.name}\n${alt.description}\n\n`;
        }
      } else {
        md += `_None documented._\n\n`;
      }

      md += `## Consequences\n`;
      if (consequences && consequences.length > 0) {
        for (const c of consequences) {
          md += `- ${c}\n`;
        }
      } else {
        md += `_To be determined._\n`;
      }
      md += "\n";

      fs.writeFileSync(filePath, md);
      updateDecisionIndex(decisionsDir);

      // Sync to SQLite
      syncSingleFile(mbPath, filePath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Decision created: **${adrId}**: ${title}\nFile: decisions/${fileName}\nStatus: ${status}`,
          },
        ],
      };
    },
  );
}
