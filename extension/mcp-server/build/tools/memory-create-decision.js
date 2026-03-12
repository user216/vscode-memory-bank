import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { syncSingleFile } from "../sync.js";
import { getMemoryBankPath, slugify, getNextId, updateDecisionIndex, DECISION_STATUSES } from "./shared-utils.js";
export function registerMemoryCreateDecision(server) {
    server.tool("memory_create_decision", "Create a new ADR decision in the memory bank with proper formatting, auto-generated ADR-NNNN ID, and index update. Creates a markdown file in memory-bank/decisions/ and syncs to SQLite. Use memory_update_status to change status later.", {
        title: z.string().describe("Decision title — concise summary (e.g. 'Use PostgreSQL for persistence', 'Adopt React Query for data fetching')"),
        context: z.string().describe("Context section — the problem, situation, or forces prompting this decision. Can be multi-line."),
        decision: z.string().describe("Decision section — what was decided and why. Can be multi-line."),
        status: z
            .enum(DECISION_STATUSES)
            .optional()
            .default("Proposed")
            .describe("Initial status (default: 'Proposed'). Use 'Accepted' if decision is already final."),
        deciders: z
            .string()
            .optional()
            .default("")
            .describe("Who made or proposed this decision (e.g. 'Team lead', 'Architecture review board')"),
        alternatives: z
            .array(z.object({
            name: z.string().describe("Alternative name (e.g. 'MySQL', 'MongoDB')"),
            description: z.string().describe("Why this alternative was considered and why it was not chosen"),
        }))
            .optional()
            .describe("Alternatives considered (optional). Each gets its own subsection in the ADR."),
        consequences: z
            .array(z.string())
            .optional()
            .describe("List of consequences — both positive and negative (optional). E.g. ['Requires team training on PostgreSQL', 'Better query performance for analytics']"),
    }, async ({ title, context, decision, status, deciders, alternatives, consequences }) => {
        const mbPath = getMemoryBankPath();
        const decisionsDir = path.join(mbPath, "decisions");
        if (!fs.existsSync(decisionsDir)) {
            fs.mkdirSync(decisionsDir, { recursive: true });
        }
        const adrId = getNextId(decisionsDir, "ADR-", 4);
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
        }
        else {
            md += `_None documented._\n\n`;
        }
        md += `## Consequences\n`;
        if (consequences && consequences.length > 0) {
            for (const c of consequences) {
                md += `- ${c}\n`;
            }
        }
        else {
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
                    type: "text",
                    text: `Decision created: **${adrId}**: ${title}\nFile: decisions/${fileName}\nStatus: ${status}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-create-decision.js.map