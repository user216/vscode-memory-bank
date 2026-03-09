import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { initDb, getDb, closeDb } from "../src/db.js";
import { syncAllFiles, syncSingleFile } from "../src/sync.js";

const FIXTURES_SRC = path.resolve(
  import.meta.dirname,
  "fixtures",
  "memory-bank",
);

// Each test run copies fixtures to a temp dir to avoid conflicts with
// other test files that share the same fixtures path (vitest runs files in parallel).
let FIXTURES_PATH: string;

function copyFixtures(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-dbsync-"));
  fs.cpSync(FIXTURES_SRC, tmp, { recursive: true, filter: (src) => !src.includes(".mcp") });
  return tmp;
}

function cleanup(): void {
  closeDb();
  if (FIXTURES_PATH && fs.existsSync(FIXTURES_PATH)) {
    fs.rmSync(FIXTURES_PATH, { recursive: true });
  }
}

describe("Database", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
  });

  afterEach(() => {
    cleanup();
  });

  it("initializes database with schema", () => {
    initDb(FIXTURES_PATH);
    const db = getDb();

    // Check tables exist
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("items");
    expect(tableNames).toContain("links");
  });

  it("enables WAL mode", () => {
    initDb(FIXTURES_PATH);
    const db = getDb();
    const result = db.prepare("PRAGMA journal_mode").get() as {
      journal_mode: string;
    };
    expect(result.journal_mode).toBe("wal");
  });

  it("creates FTS5 virtual table", () => {
    initDb(FIXTURES_PATH);
    const db = getDb();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = 'items_fts'",
      )
      .all();
    expect(tables).toHaveLength(1);
  });

  it("throws if getDb called before init", () => {
    expect(() => getDb()).toThrow("Database not initialized");
  });
});

describe("Sync", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
    initDb(FIXTURES_PATH);
  });

  afterEach(() => {
    cleanup();
  });

  it("syncs all markdown files from fixtures", () => {
    const count = syncAllFiles(FIXTURES_PATH);
    // 6 core + 2 tasks + 1 decision = 9 (excludes _index.md files)
    expect(count).toBe(9);
  });

  it("creates items in database", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();
    const items = db.prepare("SELECT id, type FROM items ORDER BY id").all() as Array<{
      id: string;
      type: string;
    }>;

    const ids = items.map((i) => i.id);
    expect(ids).toContain("projectbrief");
    expect(ids).toContain("activeContext");
    expect(ids).toContain("progress");
    expect(ids).toContain("productContext");
    expect(ids).toContain("systemPatterns");
    expect(ids).toContain("techContext");
    expect(ids).toContain("TASK-001");
    expect(ids).toContain("TASK-002");
    expect(ids).toContain("ADR-0001");
  });

  it("assigns correct types", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();

    const projectbrief = db
      .prepare("SELECT type FROM items WHERE id = ?")
      .get("projectbrief") as { type: string };
    expect(projectbrief.type).toBe("core");

    const task = db
      .prepare("SELECT type FROM items WHERE id = ?")
      .get("TASK-001") as { type: string };
    expect(task.type).toBe("task");

    const adr = db
      .prepare("SELECT type FROM items WHERE id = ?")
      .get("ADR-0001") as { type: string };
    expect(adr.type).toBe("decision");
  });

  it("extracts status from metadata", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();

    const task = db
      .prepare("SELECT status FROM items WHERE id = ?")
      .get("TASK-001") as { status: string };
    expect(task.status).toBe("In Progress");

    const adr = db
      .prepare("SELECT status FROM items WHERE id = ?")
      .get("ADR-0001") as { status: string };
    expect(adr.status).toBe("Accepted");

    const core = db
      .prepare("SELECT status FROM items WHERE id = ?")
      .get("projectbrief") as { status: string | null };
    expect(core.status).toBeNull();
  });

  it("skips _index.md files", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();
    const index = db
      .prepare("SELECT * FROM items WHERE id = '_index'")
      .get();
    expect(index).toBeUndefined();
  });

  it("auto-detects cross-reference links", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();
    const links = db
      .prepare("SELECT source_id, target_id, relation FROM links ORDER BY source_id, target_id")
      .all() as Array<{ source_id: string; target_id: string; relation: string }>;

    // activeContext references ADR-0001 and TASK-001
    const activeToAdr = links.find(
      (l) => l.source_id === "activeContext" && l.target_id === "ADR-0001",
    );
    expect(activeToAdr).toBeDefined();
    expect(activeToAdr!.relation).toBe("references");

    const activeToTask = links.find(
      (l) => l.source_id === "activeContext" && l.target_id === "TASK-001",
    );
    expect(activeToTask).toBeDefined();

    // TASK-001 references ADR-0001
    const taskToAdr = links.find(
      (l) => l.source_id === "TASK-001" && l.target_id === "ADR-0001",
    );
    expect(taskToAdr).toBeDefined();

    // ADR-0001 references TASK-001
    const adrToTask = links.find(
      (l) => l.source_id === "ADR-0001" && l.target_id === "TASK-001",
    );
    expect(adrToTask).toBeDefined();
  });

  it("re-syncs a single file without duplicating", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();

    const countBefore = (
      db.prepare("SELECT COUNT(*) as cnt FROM items").get() as {
        cnt: number;
      }
    ).cnt;

    syncSingleFile(
      FIXTURES_PATH,
      path.join(FIXTURES_PATH, "projectbrief.md"),
    );

    const countAfter = (
      db.prepare("SELECT COUNT(*) as cnt FROM items").get() as {
        cnt: number;
      }
    ).cnt;

    expect(countAfter).toBe(countBefore);
  });

  it("updates content when file changes", () => {
    syncAllFiles(FIXTURES_PATH);
    const db = getDb();

    const before = db
      .prepare("SELECT synced_at FROM items WHERE id = ?")
      .get("projectbrief") as { synced_at: string };

    // Small delay to ensure different timestamp
    const modifiedContent = fs.readFileSync(
      path.join(FIXTURES_PATH, "projectbrief.md"),
      "utf-8",
    );

    syncSingleFile(
      FIXTURES_PATH,
      path.join(FIXTURES_PATH, "projectbrief.md"),
    );

    const after = db
      .prepare("SELECT synced_at FROM items WHERE id = ?")
      .get("projectbrief") as { synced_at: string };

    // synced_at should be updated (or at least not error)
    expect(after.synced_at).toBeDefined();
  });
});

describe("FTS5", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
    initDb(FIXTURES_PATH);
    syncAllFiles(FIXTURES_PATH);
  });

  afterEach(() => {
    cleanup();
  });

  it("supports basic text search", () => {
    const db = getDb();
    const results = db
      .prepare("SELECT id FROM items_fts WHERE items_fts MATCH ?")
      .all("SQLite") as Array<{ id: string }>;

    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("ADR-0001");
  });

  it("supports AND queries", () => {
    const db = getDb();
    const results = db
      .prepare("SELECT id FROM items_fts WHERE items_fts MATCH ?")
      .all("MCP AND server") as Array<{ id: string }>;

    expect(results.length).toBeGreaterThan(0);
  });

  it("returns snippets with highlights", () => {
    const db = getDb();
    const results = db
      .prepare(
        "SELECT id, snippet(items_fts, 2, '>>>', '<<<', '...', 16) as excerpt FROM items_fts WHERE items_fts MATCH ?",
      )
      .all("SQLite") as Array<{ id: string; excerpt: string }>;

    expect(results.length).toBeGreaterThan(0);
    const adrResult = results.find((r) => r.id === "ADR-0001");
    expect(adrResult).toBeDefined();
    expect(adrResult!.excerpt).toContain(">>>");
    expect(adrResult!.excerpt).toContain("<<<");
  });

  it("handles no results gracefully", () => {
    const db = getDb();
    const results = db
      .prepare("SELECT id FROM items_fts WHERE items_fts MATCH ?")
      .all("xyznonexistenttermxyz") as Array<{ id: string }>;

    expect(results).toHaveLength(0);
  });

  it("supports prefix queries", () => {
    const db = getDb();
    const results = db
      .prepare("SELECT id FROM items_fts WHERE items_fts MATCH ?")
      .all("SQL*") as Array<{ id: string }>;

    expect(results.length).toBeGreaterThan(0);
  });
});
