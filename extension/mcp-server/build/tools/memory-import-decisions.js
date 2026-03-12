import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { syncSingleFile } from "../sync.js";
import { getMemoryBankPath, slugify, getNextId, updateDecisionIndex, DECISION_STATUSES } from "./shared-utils.js";
function parseFrontMatter(content) {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!fmMatch) {
        return { frontMatter: {}, body: content };
    }
    const fm = {};
    for (const line of fmMatch[1].split(/\r?\n/)) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kvMatch) {
            fm[kvMatch[1].toLowerCase()] = kvMatch[2].trim().replace(/^["']|["']$/g, "");
        }
    }
    return { frontMatter: fm, body: fmMatch[2] };
}
function isAdrFile(filename) {
    const lower = filename.toLowerCase();
    // Match adr-NNN, adr_NNN, NNN-, or any file with "adr" in the name
    return /^adr[-_]?\d+/i.test(lower) || /^\d{4}-/.test(lower);
}
function extractAdrNumber(filename) {
    // Try adr-NNNN, adr-NNN, adr_NNNN patterns
    const adrMatch = filename.match(/^adr[-_]?(\d+)/i);
    if (adrMatch)
        return parseInt(adrMatch[1], 10);
    // Try NNNN- prefix pattern
    const numMatch = filename.match(/^(\d{4})-/);
    if (numMatch)
        return parseInt(numMatch[1], 10);
    return null;
}
function extractTitle(content, filename, frontMatter) {
    // 1. Try YAML frontmatter title
    if (frontMatter.title) {
        return frontMatter.title.replace(/^ADR[-_]?\d+:\s*/i, "").trim();
    }
    // 2. Try markdown heading (skip ADR-NNNN: prefix)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        return titleMatch[1].replace(/^ADR[-_]?\d+:\s*/i, "").trim();
    }
    // 3. Fallback: derive from filename
    return path.basename(filename, ".md")
        .replace(/^adr[-_]?\d+[-_]*/i, "")
        .replace(/^\d{4}-/, "")
        .replace(/[-_]/g, " ")
        .trim() || filename;
}
function extractStatus(frontMatter, body) {
    // 1. Try YAML frontmatter status
    if (frontMatter.status) {
        return normalizeStatus(frontMatter.status);
    }
    // 2. Try **Status:** inline
    const statusMatch = body.match(/\*\*Status:\*\*\s*(.+)/);
    if (statusMatch) {
        return normalizeStatus(statusMatch[1].trim());
    }
    return null;
}
function normalizeStatus(raw) {
    const lower = raw.toLowerCase().replace(/[^a-z]/g, "");
    for (const s of DECISION_STATUSES) {
        if (s.toLowerCase().replace(/[^a-z]/g, "") === lower)
            return s;
    }
    // Map common aliases
    if (lower === "draft")
        return "Proposed";
    if (lower === "approved")
        return "Accepted";
    return raw; // preserve as-is if unknown
}
function collectMarkdownFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_") && isAdrFile(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}
export function registerMemoryImportDecisions(server) {
    server.tool("memory_import_decisions", "Import ADR/decision markdown files into the memory bank. Can import from an external directory (assigns new ADR IDs, preserving original numbering when possible) or re-sync existing decisions from memory-bank/decisions/ to SQLite. Only imports files matching ADR naming patterns (adr-NNN*.md, NNNN-*.md); skips README.md and other non-ADR files. Parses YAML frontmatter for title and status fields.", {
        source_directory: z
            .string()
            .optional()
            .describe("Directory to import .md files from (e.g. '/path/to/docs/decisions'). Only ADR-named files are imported (adr-*.md, NNNN-*.md); README.md and non-ADR files are skipped. If omitted, re-syncs existing decisions in memory-bank/decisions/ to SQLite."),
        preserve_content: z
            .boolean()
            .optional()
            .default(true)
            .describe("If true (default), keeps original file content as-is (only prepends ADR header if missing). If false, restructures into standard ADR template with Context/Decision/Alternatives/Consequences sections."),
    }, async ({ source_directory, preserve_content }) => {
        const mbPath = getMemoryBankPath();
        const decisionsDir = path.join(mbPath, "decisions");
        if (!fs.existsSync(decisionsDir)) {
            fs.mkdirSync(decisionsDir, { recursive: true });
        }
        const results = [];
        if (!source_directory) {
            // Re-sync mode: read existing decisions and sync to SQLite
            const existingFiles = fs
                .readdirSync(decisionsDir)
                .filter((f) => f.match(/^ADR-\d{4}/) && f.endsWith(".md"));
            for (const f of existingFiles) {
                const filePath = path.join(decisionsDir, f);
                syncSingleFile(mbPath, filePath);
                const idMatch = f.match(/^(ADR-\d{4})/);
                results.push(`Synced: ${idMatch ? idMatch[1] : f}`);
            }
            updateDecisionIndex(decisionsDir);
            return {
                content: [
                    {
                        type: "text",
                        text: `Re-synced ${results.length} existing decisions to SQLite.\n${results.join("\n")}`,
                    },
                ],
            };
        }
        // Import mode: read files from source directory
        const resolvedSource = path.resolve(source_directory);
        if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isDirectory()) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Directory not found: ${resolvedSource}`,
                    },
                ],
            };
        }
        const sourceFiles = collectMarkdownFiles(resolvedSource);
        if (sourceFiles.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No .md files found in ${resolvedSource}`,
                    },
                ],
            };
        }
        for (const sourceFile of sourceFiles) {
            const rawContent = fs.readFileSync(sourceFile, "utf-8");
            const { frontMatter, body } = parseFrontMatter(rawContent);
            const title = extractTitle(body, path.basename(sourceFile), frontMatter);
            const parsedStatus = extractStatus(frontMatter, body) || "Accepted";
            // Preserve original ADR number from filename if possible
            const originalNum = extractAdrNumber(path.basename(sourceFile));
            let adrId;
            let fileName;
            if (originalNum !== null) {
                const candidateId = `ADR-${String(originalNum).padStart(4, "0")}`;
                // Check for ID conflict with existing files
                const existingFile = fs.readdirSync(decisionsDir).find((f) => f.startsWith(candidateId));
                if (existingFile) {
                    // ID conflict — assign a new one
                    adrId = getNextId(decisionsDir, "ADR-", 4);
                }
                else {
                    adrId = candidateId;
                }
                fileName = `${adrId}-${slugify(title)}.md`;
            }
            else {
                adrId = getNextId(decisionsDir, "ADR-", 4);
                fileName = `${adrId}-${slugify(title)}.md`;
            }
            const filePath = path.join(decisionsDir, fileName);
            const today = new Date().toISOString().slice(0, 10);
            let outputContent;
            if (preserve_content) {
                // Check if file already has proper ADR header
                const hasHeader = /^#\s+ADR-\d{4}:/.test(body);
                const hasStatus = /\*\*Status:\*\*/.test(body);
                if (hasHeader && hasStatus) {
                    // Already formatted — update the ID in the header and status
                    outputContent = body.replace(/^#\s+ADR-\d{4}:/, `# ${adrId}:`);
                    outputContent = outputContent.replace(/(\*\*Status:\*\*\s*).+/, `$1${parsedStatus}`);
                }
                else if (hasStatus) {
                    // Has status but no ADR header — prepend ID to title
                    outputContent = body.replace(/^#\s+(.+)$/m, `# ${adrId}: $1`);
                }
                else {
                    // No ADR formatting — prepend metadata header
                    outputContent = `# ${adrId}: ${title}\n\n**Status:** ${parsedStatus}\n**Date:** ${today}\n**Deciders:**\n\n${body}`;
                }
            }
            else {
                // Restructure into standard ADR template
                outputContent = `# ${adrId}: ${title}\n\n`;
                outputContent += `**Status:** ${parsedStatus}\n`;
                outputContent += `**Date:** ${today}\n`;
                outputContent += `**Deciders:**\n\n`;
                outputContent += `## Context\n_Imported from ${path.basename(sourceFile)}_\n\n`;
                outputContent += `## Decision\n${body}\n\n`;
                outputContent += `## Alternatives Considered\n\n_None documented._\n\n`;
                outputContent += `## Consequences\n_To be determined._\n`;
            }
            fs.writeFileSync(filePath, outputContent);
            syncSingleFile(mbPath, filePath);
            results.push(`Imported: ${path.basename(sourceFile)} → **${adrId}**: ${title}`);
        }
        updateDecisionIndex(decisionsDir);
        return {
            content: [
                {
                    type: "text",
                    text: `Imported ${results.length} decision(s) from ${resolvedSource}\n${results.join("\n")}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-import-decisions.js.map