import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile } from "../index-store.js";
import { getMemoryBankPath } from "./shared-utils.js";
export function registerMemoryAddTag(server) {
    server.tool("memory_add_tag", "Add a tag to an item's YAML frontmatter. If the item has no frontmatter, adds one. If the tag already exists, reports it. Tags help with categorization and are queryable via memory_tags.", {
        id: z.string().describe("Item ID (e.g. 'TASK-001', 'ADR-0001', 'NOTE-001')"),
        tag: z.string().describe("Tag to add (without #). E.g. 'backend', 'performance'"),
    }, async ({ id, tag: rawTag }) => {
        const mbPath = getMemoryBankPath();
        const store = getStore();
        // Normalize tag: strip # prefix, lowercase, validate
        const tag = rawTag.replace(/^#/, "").trim().toLowerCase();
        if (!/^[a-z][\w-]*$/.test(tag)) {
            return {
                content: [{
                        type: "text",
                        text: `Invalid tag: "${rawTag}". Tags must start with a letter and contain only letters, digits, hyphens.`,
                    }],
            };
        }
        const item = store.items.get(id);
        if (!item) {
            return {
                content: [{
                        type: "text",
                        text: `Item not found: "${id}". Use memory_query to list available items.`,
                    }],
            };
        }
        const filePath = path.join(mbPath, item.filePath);
        if (!fs.existsSync(filePath)) {
            return {
                content: [{
                        type: "text",
                        text: `File not found: ${item.filePath}. Index may be out of sync.`,
                    }],
            };
        }
        let content = fs.readFileSync(filePath, "utf-8");
        const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/m);
        if (fmMatch) {
            const fmBlock = fmMatch[2];
            // Check if tag already exists
            // Handle inline array: tags: [foo, bar]
            const inlineMatch = fmBlock.match(/^tags\s*:\s*\[(.+)\]$/m);
            if (inlineMatch) {
                const existingTags = inlineMatch[1].split(",").map((t) => t.trim());
                if (existingTags.includes(tag)) {
                    return {
                        content: [{
                                type: "text",
                                text: `Tag #${tag} already exists on ${id}`,
                            }],
                    };
                }
                existingTags.push(tag);
                const updatedFm = fmBlock.replace(/^tags\s*:\s*\[.+\]$/m, `tags: [${existingTags.join(", ")}]`);
                content = content.replace(fmMatch[0], `${fmMatch[1]}${updatedFm}${fmMatch[3]}`);
            }
            else if (/^tags\s*:/m.test(fmBlock)) {
                // Handle YAML list style:
                // tags:
                //   - foo
                //   - bar
                // Collect existing tags to check for duplicates
                const lines = fmBlock.split(/\r?\n/);
                let inTags = false;
                const existingTags = [];
                for (const line of lines) {
                    if (/^tags\s*:/.test(line)) {
                        inTags = true;
                        continue;
                    }
                    if (inTags) {
                        const itemMatch = line.match(/^\s+-\s+(.+)/);
                        if (itemMatch) {
                            existingTags.push(itemMatch[1].trim());
                        }
                        else {
                            inTags = false;
                        }
                    }
                }
                if (existingTags.includes(tag)) {
                    return {
                        content: [{
                                type: "text",
                                text: `Tag #${tag} already exists on ${id}`,
                            }],
                    };
                }
                // Find last tag line and insert after it
                const updatedFm = fmBlock.replace(/(^tags\s*:[\s\S]*?)((?=\n[a-z]|\n---)|$)/m, `$1  - ${tag}\n`);
                content = content.replace(fmMatch[0], `${fmMatch[1]}${updatedFm}${fmMatch[3]}`);
            }
            else {
                // Frontmatter exists but no tags key — add tags before closing ---
                const updatedFm = `${fmBlock}\ntags: [${tag}]`;
                content = content.replace(fmMatch[0], `${fmMatch[1]}${updatedFm}${fmMatch[3]}`);
            }
        }
        else {
            // No frontmatter at all — prepend minimal frontmatter
            content = `---\ntags: [${tag}]\n---\n${content}`;
        }
        fs.writeFileSync(filePath, content);
        reindexFile(store, filePath);
        return {
            content: [{
                    type: "text",
                    text: `Tag #${tag} added to ${id}`,
                }],
        };
    });
}
//# sourceMappingURL=memory-add-tag.js.map