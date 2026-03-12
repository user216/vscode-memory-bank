import * as fs from "node:fs";
import * as path from "node:path";
import { getDb } from "./db.js";
import { parseMarkdownFile, isIndexFile, extractCrossRefs } from "./parser.js";
export function syncAllFiles(memoryBankPath) {
    const db = getDb();
    const now = new Date().toISOString();
    let synced = 0;
    const upsert = db.prepare(`
    INSERT INTO items (id, type, title, status, file_path, content, metadata, created_at, updated_at, synced_at)
    VALUES (@id, @type, @title, @status, @file_path, @content, @metadata, @created_at, @updated_at, @synced_at)
    ON CONFLICT(id) DO UPDATE SET
      type = @type,
      title = @title,
      status = @status,
      file_path = @file_path,
      content = @content,
      metadata = @metadata,
      created_at = @created_at,
      updated_at = @updated_at,
      synced_at = @synced_at
  `);
    const files = collectMarkdownFiles(memoryBankPath);
    const syncTransaction = db.transaction(() => {
        for (const filePath of files) {
            const relativePath = path.relative(memoryBankPath, filePath);
            if (isIndexFile(filePath))
                continue;
            const content = fs.readFileSync(filePath, "utf-8");
            const parsed = parseMarkdownFile(relativePath, content);
            upsert.run({
                id: parsed.id,
                type: parsed.type,
                title: parsed.title,
                status: parsed.status,
                file_path: relativePath,
                content: parsed.content,
                metadata: JSON.stringify(parsed.metadata),
                created_at: parsed.createdAt,
                updated_at: parsed.updatedAt,
                synced_at: now,
            });
            synced++;
        }
    });
    syncTransaction();
    // Auto-detect and create cross-reference links
    syncCrossRefs();
    console.error(`Synced ${synced} files from ${memoryBankPath}`);
    return synced;
}
export function syncSingleFile(memoryBankPath, filePath) {
    const db = getDb();
    const now = new Date().toISOString();
    const relativePath = path.relative(memoryBankPath, filePath);
    if (isIndexFile(filePath))
        return;
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMarkdownFile(relativePath, content);
    db.prepare(`
    INSERT INTO items (id, type, title, status, file_path, content, metadata, created_at, updated_at, synced_at)
    VALUES (@id, @type, @title, @status, @file_path, @content, @metadata, @created_at, @updated_at, @synced_at)
    ON CONFLICT(id) DO UPDATE SET
      type = @type,
      title = @title,
      status = @status,
      file_path = @file_path,
      content = @content,
      metadata = @metadata,
      created_at = @created_at,
      updated_at = @updated_at,
      synced_at = @synced_at
  `).run({
        id: parsed.id,
        type: parsed.type,
        title: parsed.title,
        status: parsed.status,
        file_path: relativePath,
        content: parsed.content,
        metadata: JSON.stringify(parsed.metadata),
        created_at: parsed.createdAt,
        updated_at: parsed.updatedAt,
        synced_at: now,
    });
    // Re-sync cross-refs for this item
    syncCrossRefsForItem(parsed);
    console.error(`Synced file: ${relativePath}`);
}
function syncCrossRefs() {
    const db = getDb();
    const items = db
        .prepare("SELECT id, content FROM items")
        .all();
    const existingIds = new Set(items.map((i) => i.id));
    const now = new Date().toISOString();
    const insertLink = db.prepare(`
    INSERT OR IGNORE INTO links (source_id, target_id, relation, created_at)
    VALUES (@source_id, @target_id, @relation, @created_at)
  `);
    const linkTransaction = db.transaction(() => {
        // Clear auto-detected references (keep manually created ones)
        db.prepare("DELETE FROM links WHERE relation = 'references'").run();
        for (const item of items) {
            const refs = extractCrossRefs(item.content);
            for (const ref of refs) {
                if (ref !== item.id && existingIds.has(ref)) {
                    insertLink.run({
                        source_id: item.id,
                        target_id: ref,
                        relation: "references",
                        created_at: now,
                    });
                }
            }
        }
    });
    linkTransaction();
}
function syncCrossRefsForItem(parsed) {
    const db = getDb();
    const now = new Date().toISOString();
    const existingIds = new Set(db.prepare("SELECT id FROM items").all().map((r) => r.id));
    // Remove old auto-detected refs from this item
    db.prepare("DELETE FROM links WHERE source_id = ? AND relation = 'references'").run(parsed.id);
    const insertLink = db.prepare(`
    INSERT OR IGNORE INTO links (source_id, target_id, relation, created_at)
    VALUES (@source_id, @target_id, @relation, @created_at)
  `);
    for (const ref of parsed.crossRefs) {
        if (ref !== parsed.id && existingIds.has(ref)) {
            insertLink.run({
                source_id: parsed.id,
                target_id: ref,
                relation: "references",
                created_at: now,
            });
        }
    }
}
function collectMarkdownFiles(dir) {
    const files = [];
    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                // Skip hidden directories
                if (!entry.name.startsWith(".")) {
                    walk(fullPath);
                }
            }
            else if (entry.name.endsWith(".md")) {
                files.push(fullPath);
            }
        }
    }
    walk(dir);
    return files;
}
export function watchMemoryBank(memoryBankPath) {
    const watcher = fs.watch(memoryBankPath, { recursive: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith(".md"))
            return;
        const fullPath = path.join(memoryBankPath, filename);
        // Debounce: ignore if file doesn't exist (deleted) or is an index
        if (!fs.existsSync(fullPath))
            return;
        if (isIndexFile(fullPath))
            return;
        console.error(`File changed: ${filename}, re-syncing...`);
        try {
            syncSingleFile(memoryBankPath, fullPath);
        }
        catch (err) {
            console.error(`Error syncing ${filename}:`, err);
        }
    });
    console.error(`Watching for changes in ${memoryBankPath}`);
    return watcher;
}
//# sourceMappingURL=sync.js.map