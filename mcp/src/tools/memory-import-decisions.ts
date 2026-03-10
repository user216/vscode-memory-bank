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

function extractTitle(content: string, filename: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    // Strip ADR-NNNN: prefix if present
    return titleMatch[1].replace(/^ADR-\d{4}:\s*/, "").trim();
  }
  // Fallback: derive from filename
  return path.basename(filename, ".md")
    .replace(/^[\d-]+/, "")
    .replace(/[-_]/g, " ")
    .trim() || filename;
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function registerMemoryImportDecisions(server: McpServer): void {
  server.tool(
    "memory_import_decisions",
    "Import ADR/decision markdown files into the memory bank. Can import from an external directory (assigns new ADR IDs) or re-sync existing decisions from memory-bank/decisions/ to SQLite.",
    {
      source_directory: z
        .string()
        .optional()
        .describe("Directory to import .md files from. If omitted, re-syncs existing decisions in memory-bank/decisions/"),
      preserve_content: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, keeps original file content as-is (only prepends ADR header if missing). If false, restructures into standard ADR template."),
    },
    async ({ source_directory, preserve_content }) => {
      const mbPath = getMemoryBankPath();
      const decisionsDir = path.join(mbPath, "decisions");

      if (!fs.existsSync(decisionsDir)) {
        fs.mkdirSync(decisionsDir, { recursive: true });
      }

      const results: string[] = [];

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
              type: "text" as const,
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
              type: "text" as const,
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
              type: "text" as const,
              text: `No .md files found in ${resolvedSource}`,
            },
          ],
        };
      }

      for (const sourceFile of sourceFiles) {
        const content = fs.readFileSync(sourceFile, "utf-8");
        const title = extractTitle(content, path.basename(sourceFile));

        // Check if this file already has an ADR-NNNN ID
        const existingIdMatch = path.basename(sourceFile).match(/^(ADR-\d{4})/);

        let adrId: string;
        let fileName: string;

        if (existingIdMatch) {
          // File already has an ADR ID — check if it conflicts with existing
          adrId = existingIdMatch[1];
          const existingFile = fs.readdirSync(decisionsDir).find((f) => f.startsWith(adrId));
          if (existingFile) {
            // ID conflict — assign a new one
            adrId = getNextAdrId(decisionsDir);
          }
          fileName = `${adrId}-${slugify(title)}.md`;
        } else {
          adrId = getNextAdrId(decisionsDir);
          fileName = `${adrId}-${slugify(title)}.md`;
        }

        const filePath = path.join(decisionsDir, fileName);
        const today = new Date().toISOString().slice(0, 10);

        let outputContent: string;

        if (preserve_content) {
          // Check if file already has proper ADR header
          const hasHeader = /^#\s+ADR-\d{4}:/.test(content);
          const hasStatus = /\*\*Status:\*\*/.test(content);

          if (hasHeader && hasStatus) {
            // Already formatted — just update the ID in the header
            outputContent = content.replace(/^#\s+ADR-\d{4}:/, `# ${adrId}:`);
          } else if (hasStatus) {
            // Has status but no ADR header — prepend ID to title
            outputContent = content.replace(/^#\s+(.+)$/m, `# ${adrId}: $1`);
          } else {
            // No ADR formatting — prepend metadata header
            outputContent = `# ${adrId}: ${title}\n\n**Status:** Proposed\n**Date:** ${today}\n**Deciders:**\n\n${content}`;
          }
        } else {
          // Restructure into standard ADR template
          outputContent = `# ${adrId}: ${title}\n\n`;
          outputContent += `**Status:** Proposed\n`;
          outputContent += `**Date:** ${today}\n`;
          outputContent += `**Deciders:**\n\n`;
          outputContent += `## Context\n_Imported from ${path.basename(sourceFile)}_\n\n`;
          outputContent += `## Decision\n${content}\n\n`;
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
            type: "text" as const,
            text: `Imported ${results.length} decision(s) from ${resolvedSource}\n${results.join("\n")}`,
          },
        ],
      };
    },
  );
}
