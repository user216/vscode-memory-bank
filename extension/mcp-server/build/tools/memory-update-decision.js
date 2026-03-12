import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDb } from "../db.js";
import { syncSingleFile } from "../sync.js";
import { getMemoryBankPath, updateDecisionIndex } from "./shared-utils.js";
function parseAdr(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
    const decidersMatch = content.match(/\*\*Deciders:\*\*\s*(.*)/);
    if (!titleMatch)
        return null;
    const contextMatch = content.match(/## Context\n([\s\S]*?)(?=\n## )/);
    const decisionMatch = content.match(/## Decision\n([\s\S]*?)(?=\n## )/);
    const alternativesMatch = content.match(/## Alternatives Considered\n\n([\s\S]*?)(?=\n## |\s*$)/);
    const consequencesMatch = content.match(/## Consequences\n([\s\S]*?)(?=\n## |\s*$)/);
    // Capture any sections after Consequences (e.g. Progress Log)
    const consequencesEnd = content.indexOf("## Consequences");
    let rest = "";
    if (consequencesEnd !== -1) {
        const afterConsequences = content.slice(consequencesEnd);
        const nextSection = afterConsequences.indexOf("\n## ", 1);
        if (nextSection !== -1) {
            rest = afterConsequences.slice(nextSection);
        }
    }
    return {
        title: titleMatch[1].trim(),
        status: statusMatch ? statusMatch[1].trim() : "Proposed",
        date: dateMatch ? dateMatch[1].trim() : new Date().toISOString().slice(0, 10),
        deciders: decidersMatch ? decidersMatch[1].trim() : "",
        context: contextMatch ? contextMatch[1].trim() : "",
        decision: decisionMatch ? decisionMatch[1].trim() : "",
        alternatives: alternativesMatch ? alternativesMatch[1].trim() : "_None documented._",
        consequences: consequencesMatch ? consequencesMatch[1].trim() : "_To be determined._",
        rest,
    };
}
function rebuildAdr(id, sections) {
    // Strip old ADR-NNNN: prefix from title if present
    const cleanTitle = sections.title.replace(/^ADR-\d{4}:\s*/, "");
    let md = `# ${id}: ${cleanTitle}\n\n`;
    md += `**Status:** ${sections.status}\n`;
    md += `**Date:** ${sections.date}\n`;
    md += `**Deciders:** ${sections.deciders}\n\n`;
    md += `## Context\n${sections.context}\n\n`;
    md += `## Decision\n${sections.decision}\n\n`;
    md += `## Alternatives Considered\n\n${sections.alternatives}\n\n`;
    md += `## Consequences\n${sections.consequences}\n`;
    if (sections.rest) {
        md += `\n${sections.rest}`;
    }
    else {
        md += "\n";
    }
    return md;
}
export function registerMemoryUpdateDecision(server) {
    server.tool("memory_update_decision", "Update the content of an existing ADR decision. Can modify title, context, decision, alternatives, and/or consequences sections. For status-only changes, use memory_update_status instead. Rewrites the markdown file, updates the index, and syncs to SQLite.", {
        id: z
            .string()
            .describe("ADR ID to update (e.g. 'ADR-0001'). Must exist — use memory_query with type 'decision' to find IDs."),
        title: z
            .string()
            .optional()
            .describe("New decision title. Omit to keep existing."),
        context: z
            .string()
            .optional()
            .describe("New context section content. Replaces entire section. Omit to keep existing."),
        decision: z
            .string()
            .optional()
            .describe("New decision section content. Replaces entire section. Omit to keep existing."),
        alternatives: z
            .array(z.object({
            name: z.string().describe("Alternative name (e.g. 'MySQL', 'MongoDB')"),
            description: z.string().describe("Why this alternative was considered and why it was not chosen"),
        }))
            .optional()
            .describe("New alternatives list. Replaces entire section. Omit to keep existing. Pass empty array to clear."),
        consequences: z
            .array(z.string())
            .optional()
            .describe("New consequences list. Replaces entire section. Omit to keep existing. Pass empty array to clear."),
    }, async ({ id, title, context, decision, alternatives, consequences }) => {
        const mbPath = getMemoryBankPath();
        const db = getDb();
        // Find the item in the database
        const item = db
            .prepare("SELECT id, type, file_path FROM items WHERE id = ?")
            .get(id);
        if (!item) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Decision not found: "${id}". Use memory_query with type 'decision' to list available ADRs.`,
                    },
                ],
            };
        }
        if (item.type !== "decision") {
            return {
                content: [
                    {
                        type: "text",
                        text: `"${id}" is a ${item.type}, not a decision. Use this tool only for ADR-NNNN items.`,
                    },
                ],
            };
        }
        const filePath = path.join(mbPath, item.file_path);
        if (!fs.existsSync(filePath)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `File not found: ${item.file_path}. Database may be out of sync — try memory_import_decisions to re-sync.`,
                    },
                ],
            };
        }
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const sections = parseAdr(fileContent);
        if (!sections) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Could not parse ADR structure in ${item.file_path}. File may not follow standard ADR format.`,
                    },
                ],
            };
        }
        // Track what changed
        const changes = [];
        if (title !== undefined) {
            sections.title = title;
            changes.push("title");
        }
        if (context !== undefined) {
            sections.context = context;
            changes.push("context");
        }
        if (decision !== undefined) {
            sections.decision = decision;
            changes.push("decision");
        }
        if (alternatives !== undefined) {
            if (alternatives.length > 0) {
                sections.alternatives = alternatives
                    .map((alt) => `### ${alt.name}\n${alt.description}`)
                    .join("\n\n");
            }
            else {
                sections.alternatives = "_None documented._";
            }
            changes.push("alternatives");
        }
        if (consequences !== undefined) {
            if (consequences.length > 0) {
                sections.consequences = consequences.map((c) => `- ${c}`).join("\n");
            }
            else {
                sections.consequences = "_To be determined._";
            }
            changes.push("consequences");
        }
        if (changes.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No changes specified for ${id}. Provide at least one field to update (title, context, decision, alternatives, consequences).`,
                    },
                ],
            };
        }
        // Update date
        sections.date = new Date().toISOString().slice(0, 10);
        // Rebuild and write
        const newContent = rebuildAdr(id, sections);
        fs.writeFileSync(filePath, newContent);
        // Update index
        const decisionsDir = path.dirname(filePath);
        updateDecisionIndex(decisionsDir);
        // Sync to SQLite
        syncSingleFile(mbPath, filePath);
        return {
            content: [
                {
                    type: "text",
                    text: `Decision updated: **${id}**\nChanged: ${changes.join(", ")}\nFile: ${item.file_path}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-update-decision.js.map