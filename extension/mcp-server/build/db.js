import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";
let db = null;
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  type UNINDEXED,
  content=items,
  content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, id, title, content, type)
  VALUES (new.rowid, new.id, new.title, new.content, new.type);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, id, title, content, type)
  VALUES ('delete', old.rowid, old.id, old.title, old.content, old.type);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, id, title, content, type)
  VALUES ('delete', old.rowid, old.id, old.title, old.content, old.type);
  INSERT INTO items_fts(rowid, id, title, content, type)
  VALUES (new.rowid, new.id, new.title, new.content, new.type);
END;

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES items(id),
  target_id TEXT NOT NULL REFERENCES items(id),
  relation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(source_id, target_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
`;
export function getDb() {
    if (!db) {
        throw new Error("Database not initialized. Call initDb() first.");
    }
    return db;
}
export function initDb(memoryBankPath) {
    const dbDir = path.join(memoryBankPath, ".mcp");
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, "memory-bank.db");
    db = new Database(dbPath);
    // Enable WAL mode for better concurrent read performance
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    // Create schema
    db.exec(SCHEMA_SQL);
    console.error(`Database initialized at ${dbPath}`);
    return db;
}
export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
//# sourceMappingURL=db.js.map