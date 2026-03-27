import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile } from "../index-store.js";
import { getMemoryBankPath, getNextId, slugify } from "./shared-utils.js";
export function registerMemoryCreateNote(server) {
    server.tool("memory_create_note", "Create a new note in the memory bank with YAML frontmatter, auto-generated NOTE-NNN ID, and tags. Notes are general-purpose knowledge items (patterns, insights, reference material).", {
        title: z.string().describe("Note title — short, descriptive (e.g. 'API Rate Limiting Patterns', 'Database Migration Checklist')"),
        content: z.string().describe("Note content in markdown. Can include [[wikilinks]] and #tags."),
        tags: z
            .array(z.string())
            .optional()
            .describe("Tags for categorization (without #). E.g. ['backend', 'performance', 'patterns']"),
        related: z
            .array(z.string())
            .optional()
            .describe("Related item IDs for cross-linking. E.g. ['ADR-0001', 'TASK-003']"),
    }, async ({ title, content, tags, related }) => {
        const mbPath = getMemoryBankPath();
        // Notes go in the root directory (flat layout)
        const noteId = getNextId(mbPath, "NOTE-", 3);
        const slug = slugify(title);
        const fileName = `${noteId}-${slug}.md`;
        const filePath = path.join(mbPath, fileName);
        const today = new Date().toISOString().slice(0, 10);
        // Build YAML frontmatter
        let md = "---\n";
        md += `title: "${title.replace(/"/g, '\\"')}"\n`;
        md += `type: note\n`;
        md += `created: ${today}\n`;
        md += `updated: ${today}\n`;
        if (tags && tags.length > 0) {
            md += `tags:\n`;
            for (const tag of tags) {
                md += `  - ${tag}\n`;
            }
        }
        if (related && related.length > 0) {
            md += `related:\n`;
            for (const rel of related) {
                md += `  - ${rel}\n`;
            }
        }
        md += "---\n\n";
        md += `# ${noteId}: ${title}\n\n`;
        md += content;
        md += "\n";
        fs.writeFileSync(filePath, md);
        // Sync to in-memory index
        const store = getStore();
        reindexFile(store, filePath);
        return {
            content: [
                {
                    type: "text",
                    text: `Note created: **${noteId}**: ${title}\nFile: ${fileName}${tags && tags.length > 0 ? `\nTags: ${tags.map((t) => `#${t}`).join(", ")}` : ""}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-create-note.js.map