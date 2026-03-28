import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStore, reindexFile, removeItemFromStore, resetStore, addLinkToStore } from "../index-store.js";
import { getMemoryBankPath } from "./shared-utils.js";
import { deriveId } from "../parser.js";
export function registerMemoryMigrateV1(server) {
    server.tool("memory_migrate_v1", "Detect and optionally migrate v1 layout artifacts to the flat v2 layout. Moves files from tasks/ and decisions/ subdirectories to the memory-bank root, adds YAML frontmatter if missing, removes empty subdirectories, and deletes deprecated v1 core files (activeContext.md, progress.md, productContext.md, techContext.md, systemPatterns.md) per ADR-0015. Use dry_run=true (default) to preview changes first.", {
        dry_run: z
            .boolean()
            .optional()
            .default(true)
            .describe("Preview changes without applying. Set to false to actually migrate."),
    }, async ({ dry_run }) => {
        const mbPath = getMemoryBankPath();
        const store = getStore();
        const today = new Date().toISOString().slice(0, 10);
        const actions = [];
        const warnings = [];
        // Snapshot user-created links before migration (non-auto-detected)
        const savedLinks = [];
        if (!dry_run) {
            for (const [source, links] of store.outgoing) {
                for (const link of links) {
                    if (link.relation !== "references" && link.relation !== "related") {
                        savedLinks.push({ source, target: link.target, relation: link.relation });
                    }
                }
            }
        }
        const subdirs = [
            { dir: "tasks", prefix: "TASK-", padding: 3, type: "task" },
            { dir: "decisions", prefix: "ADR-", padding: 4, type: "decision" },
        ];
        for (const { dir, prefix, type } of subdirs) {
            const subdir = path.join(mbPath, dir);
            if (!fs.existsSync(subdir))
                continue;
            const files = fs.readdirSync(subdir).filter((f) => f.endsWith(".md") && f !== "_index.md");
            for (const file of files) {
                const sourcePath = path.join(subdir, file);
                const content = fs.readFileSync(sourcePath, "utf-8");
                const id = deriveId(path.join(dir, file));
                const targetName = `${id}.md`;
                const targetPath = path.join(mbPath, targetName);
                // Check for conflict
                if (fs.existsSync(targetPath)) {
                    warnings.push(`Duplicate: ${dir}/${file} → ${targetName} already exists in root (skipped)`);
                    continue;
                }
                if (dry_run) {
                    actions.push(`Move: ${dir}/${file} → ${targetName}`);
                }
                else {
                    // Add YAML frontmatter if missing
                    let outputContent = content;
                    if (!/^---\r?\n/.test(content)) {
                        // Extract status from inline metadata
                        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
                        const status = statusMatch ? statusMatch[1].trim() : (type === "task" ? "Pending" : "Proposed");
                        outputContent = `---\ntype: ${type}\nstatus: ${status}\ncreated: ${today}\nupdated: ${today}\n---\n${content}`;
                    }
                    fs.writeFileSync(targetPath, outputContent);
                    fs.unlinkSync(sourcePath);
                    reindexFile(store, targetPath);
                    actions.push(`Moved: ${dir}/${file} → ${targetName}`);
                }
            }
            // Handle _index.md
            const indexPath = path.join(subdir, "_index.md");
            if (fs.existsSync(indexPath)) {
                if (dry_run) {
                    actions.push(`Delete: ${dir}/_index.md (no longer used in v2)`);
                }
                else {
                    fs.unlinkSync(indexPath);
                    actions.push(`Deleted: ${dir}/_index.md`);
                }
            }
            // Remove empty directory
            if (!dry_run) {
                const remaining = fs.existsSync(subdir) ? fs.readdirSync(subdir) : [];
                if (remaining.length === 0) {
                    fs.rmdirSync(subdir);
                    actions.push(`Removed empty directory: ${dir}/`);
                }
                else {
                    warnings.push(`Directory ${dir}/ not empty after migration (${remaining.length} files remain)`);
                }
            }
        }
        // Detect and delete deprecated v1 core files (ADR-0015 §7)
        const DEPRECATED_CORE_FILES = [
            "activeContext.md",
            "progress.md",
            "productContext.md",
            "techContext.md",
            "systemPatterns.md",
        ];
        for (const filename of DEPRECATED_CORE_FILES) {
            const filePath = path.join(mbPath, filename);
            if (!fs.existsSync(filePath))
                continue;
            if (dry_run) {
                actions.push(`Delete deprecated: ${filename} (replaced by tasks/notes/memory_status in v2)`);
                // Warn if file has substantial content worth preserving
                const content = fs.readFileSync(filePath, "utf-8");
                const strippedContent = content.replace(/^---[\s\S]*?---\n?/, "").replace(/^#.*$/gm, "").replace(/\*\*\w[\w\s]*?:\*\*.*$/gm, "").trim();
                if (strippedContent.length > 50) {
                    warnings.push(`${filename} contains content that will be deleted. Consider saving valuable context to a NOTE (memory_create_note) before running migration.`);
                }
            }
            else {
                const id = filename.replace(".md", "");
                if (store.items.has(id)) {
                    removeItemFromStore(store, id);
                }
                fs.unlinkSync(filePath);
                actions.push(`Deleted deprecated: ${filename}`);
            }
        }
        // Also delete root-level _index.md if present
        const rootIndex = path.join(mbPath, "_index.md");
        if (fs.existsSync(rootIndex)) {
            if (dry_run) {
                actions.push("Delete: _index.md (no longer used in v2)");
            }
            else {
                fs.unlinkSync(rootIndex);
                actions.push("Deleted: _index.md");
            }
        }
        // Delete orphaned .mcp directory (pre-ADR-0016 SQLite database)
        const mcpDir = path.join(mbPath, ".mcp");
        if (fs.existsSync(mcpDir)) {
            if (dry_run) {
                actions.push("Delete: .mcp/ directory (orphaned SQLite database from pre-ADR-0016)");
            }
            else {
                fs.rmSync(mcpDir, { recursive: true });
                actions.push("Deleted: .mcp/ directory");
            }
        }
        // Create README.md if missing (v1 memory-banks don't have one)
        const readmePath = path.join(mbPath, "README.md");
        if (!fs.existsSync(readmePath)) {
            if (dry_run) {
                actions.push("Create: README.md (v2 navigation index)");
            }
            else {
                const readmeContent = `---\ntype: structure\ntitle: Memory Bank Index\ncreated: ${today}\nupdated: ${today}\n---\n# Memory Bank\n\nProject map and navigation.\n\n- [[projectbrief]] — Project overview, goals, constraints\n\n## Tasks\n\n_Use \`memory_create_task\` or create TASK-NNN.md files._\n\n## Decisions\n\n_Use \`memory_create_decision\` or create ADR-NNNN.md files._\n\n## Notes\n\n_Use \`memory_create_note\` for knowledge items, patterns, and reference material._\n`;
                fs.writeFileSync(readmePath, readmeContent);
                reindexFile(store, readmePath);
                actions.push("Created: README.md (v2 navigation index)");
            }
        }
        // Rebuild store from disk to ensure consistency (item count + link graph)
        if (!dry_run && actions.length > 0) {
            resetStore(store);
            // Restore user-created links
            let restoredLinks = 0;
            for (const { source, target, relation } of savedLinks) {
                if (store.items.has(source) && store.items.has(target)) {
                    addLinkToStore(store, source, target, relation);
                    restoredLinks++;
                }
            }
            if (savedLinks.length > 0) {
                actions.push(`Restored ${restoredLinks}/${savedLinks.length} user-created link(s)`);
            }
        }
        const mode = dry_run ? "DRY RUN" : "MIGRATION COMPLETE";
        const summary = [`${mode}: ${actions.length} action(s)`];
        if (actions.length > 0) {
            summary.push("", ...actions.map((a) => `  ${a}`));
        }
        if (warnings.length > 0) {
            summary.push("", "Warnings:", ...warnings.map((w) => `  ${w}`));
        }
        if (dry_run && actions.length > 0) {
            summary.push("", "Run with dry_run=false to apply these changes.");
        }
        return {
            content: [{ type: "text", text: summary.join("\n") }],
        };
    });
}
//# sourceMappingURL=memory-migrate-v1.js.map