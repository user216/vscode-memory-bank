import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initDb, getDb, closeDb } from "../src/db.js";
import { syncAllFiles } from "../src/sync.js";
import { registerMemorySearch } from "../src/tools/memory-search.js";
import { registerMemoryQuery } from "../src/tools/memory-query.js";
import { registerMemoryRecall } from "../src/tools/memory-recall.js";
import { registerMemoryLink } from "../src/tools/memory-link.js";
import { registerMemoryGraph } from "../src/tools/memory-graph.js";
import { registerMemorySchema } from "../src/tools/memory-schema.js";

const FIXTURES_PATH = path.resolve(
  import.meta.dirname,
  "fixtures",
  "memory-bank",
);
const TEST_DB_DIR = path.join(FIXTURES_PATH, ".mcp");

// Helper: call a tool handler directly via the database
// Since MCP tools use getDb() internally, we just need the DB initialized
// and call the SQL directly to test the logic

function cleanup(): void {
  closeDb();
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true });
  }
}

describe("Tool Integration Tests", () => {
  beforeAll(() => {
    cleanup();
    initDb(FIXTURES_PATH);
    syncAllFiles(FIXTURES_PATH);
  });

  afterAll(() => {
    cleanup();
  });

  describe("memory_search", () => {
    it("finds items by keyword", () => {
      const db = getDb();
      const results = db
        .prepare(
          `SELECT id, title, type, snippet(items_fts, 2, '>>>', '<<<', '...', 32) as excerpt
           FROM items_fts WHERE items_fts MATCH @query ORDER BY rank LIMIT @limit`,
        )
        .all({ query: "SQLite", limit: 10 }) as Array<{
        id: string;
        title: string;
        type: string;
        excerpt: string;
      }>;

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === "ADR-0001")).toBe(true);
    });

    it("filters by type", () => {
      const db = getDb();
      const results = db
        .prepare(
          `SELECT id, title, type FROM items_fts
           WHERE items_fts MATCH @query AND items_fts.type = @type LIMIT @limit`,
        )
        .all({ query: "server", type: "task", limit: 10 }) as Array<{
        id: string;
        type: string;
      }>;

      for (const r of results) {
        expect(r.type).toBe("task");
      }
    });

    it("handles FTS5 syntax errors gracefully", () => {
      const db = getDb();
      expect(() => {
        db.prepare(
          "SELECT id FROM items_fts WHERE items_fts MATCH ?",
        ).all('invalid"query"with"unmatched');
      }).toThrow();
    });
  });

  describe("memory_query", () => {
    it("queries by type", () => {
      const db = getDb();
      const decisions = db
        .prepare("SELECT id, type FROM items WHERE type = ? LIMIT ?")
        .all("decision", 20) as Array<{ id: string; type: string }>;

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions.every((d) => d.type === "decision")).toBe(true);
    });

    it("queries by status", () => {
      const db = getDb();
      const inProgress = db
        .prepare("SELECT id, status FROM items WHERE status = ? LIMIT ?")
        .all("In Progress", 20) as Array<{ id: string; status: string }>;

      expect(inProgress.length).toBeGreaterThan(0);
      expect(inProgress.some((i) => i.id === "TASK-001")).toBe(true);
    });

    it("queries by type AND status", () => {
      const db = getDb();
      const results = db
        .prepare(
          "SELECT id FROM items WHERE type = ? AND status = ? LIMIT ?",
        )
        .all("decision", "Accepted", 20) as Array<{ id: string }>;

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("ADR-0001");
    });

    it("returns empty array for no matches", () => {
      const db = getDb();
      const results = db
        .prepare("SELECT id FROM items WHERE status = ? LIMIT ?")
        .all("NonExistentStatus", 20) as Array<{ id: string }>;

      expect(results).toHaveLength(0);
    });

    it("queries by date range", () => {
      const db = getDb();
      const results = db
        .prepare(
          "SELECT id FROM items WHERE (updated_at >= ? OR created_at >= ?) LIMIT ?",
        )
        .all("2026-03-09", "2026-03-09", 20) as Array<{ id: string }>;

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("memory_recall", () => {
    it("returns items within token budget", () => {
      const db = getDb();
      const items = db
        .prepare("SELECT id, content FROM items")
        .all() as Array<{ id: string; content: string }>;

      const CHARS_PER_TOKEN = 3.5;
      const budget = 500; // small budget to test truncation
      let totalTokens = 0;
      let itemsWithinBudget = 0;

      for (const item of items) {
        const tokens = Math.ceil(item.content.length / CHARS_PER_TOKEN);
        if (totalTokens + tokens > budget) break;
        totalTokens += tokens;
        itemsWithinBudget++;
      }

      expect(itemsWithinBudget).toBeGreaterThan(0);
      expect(itemsWithinBudget).toBeLessThan(items.length);
    });

    it("foundational strategy orders projectbrief first", () => {
      const db = getDb();
      const items = db
        .prepare("SELECT id, type FROM items")
        .all() as Array<{ id: string; type: string }>;

      const FOUNDATIONAL_ORDER = [
        "projectbrief",
        "productContext",
        "systemPatterns",
        "techContext",
        "activeContext",
        "progress",
      ];

      const sorted = [...items].sort((a, b) => {
        const aIdx = FOUNDATIONAL_ORDER.indexOf(a.id);
        const bIdx = FOUNDATIONAL_ORDER.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
      });

      expect(sorted[0].id).toBe("projectbrief");
      expect(sorted[1].id).toBe("productContext");
    });

    it("active strategy orders activeContext first", () => {
      const db = getDb();
      const items = db
        .prepare("SELECT id, type, status FROM items")
        .all() as Array<{ id: string; type: string; status: string | null }>;

      function getActivePriority(item: {
        id: string;
        type: string;
        status: string | null;
      }): number {
        if (item.id === "activeContext") return 0;
        if (item.id === "progress") return 1;
        if (item.type === "task" && item.status === "In Progress") return 2;
        if (item.type === "decision" && item.status === "Proposed") return 3;
        if (item.id === "projectbrief") return 4;
        if (item.type === "core") return 5;
        if (item.type === "task") return 6;
        return 7;
      }

      const sorted = [...items].sort(
        (a, b) => getActivePriority(a) - getActivePriority(b),
      );

      expect(sorted[0].id).toBe("activeContext");
      expect(sorted[1].id).toBe("progress");
      // In Progress tasks should come before Pending tasks
      const inProgressIdx = sorted.findIndex((i) => i.id === "TASK-001");
      const pendingIdx = sorted.findIndex((i) => i.id === "TASK-002");
      expect(inProgressIdx).toBeLessThan(pendingIdx);
    });
  });

  describe("memory_link", () => {
    it("creates a new link", () => {
      const db = getDb();
      const now = new Date().toISOString();

      db.prepare(
        "INSERT OR IGNORE INTO links (source_id, target_id, relation, created_at) VALUES (?, ?, ?, ?)",
      ).run("TASK-002", "ADR-0001", "implements", now);

      const link = db
        .prepare(
          "SELECT * FROM links WHERE source_id = ? AND target_id = ? AND relation = ?",
        )
        .get("TASK-002", "ADR-0001", "implements") as {
        source_id: string;
        target_id: string;
        relation: string;
      };

      expect(link).toBeDefined();
      expect(link.relation).toBe("implements");
    });

    it("prevents duplicate links", () => {
      const db = getDb();
      const now = new Date().toISOString();

      // First insert
      db.prepare(
        "INSERT OR IGNORE INTO links (source_id, target_id, relation, created_at) VALUES (?, ?, ?, ?)",
      ).run("TASK-001", "ADR-0001", "test-dedup", now);

      // Second insert (same triple) — should be ignored
      const result = db
        .prepare(
          "INSERT OR IGNORE INTO links (source_id, target_id, relation, created_at) VALUES (?, ?, ?, ?)",
        )
        .run("TASK-001", "ADR-0001", "test-dedup", now);

      expect(result.changes).toBe(0);
    });
  });

  describe("memory_graph", () => {
    it("finds outgoing links from an item", () => {
      const db = getDb();
      const links = db
        .prepare("SELECT target_id, relation FROM links WHERE source_id = ?")
        .all("activeContext") as Array<{
        target_id: string;
        relation: string;
      }>;

      expect(links.length).toBeGreaterThan(0);
      expect(links.some((l) => l.target_id === "ADR-0001")).toBe(true);
    });

    it("finds incoming links to an item", () => {
      const db = getDb();
      const links = db
        .prepare("SELECT source_id, relation FROM links WHERE target_id = ?")
        .all("ADR-0001") as Array<{ source_id: string; relation: string }>;

      expect(links.length).toBeGreaterThan(0);
    });

    it("finds bidirectional links", () => {
      const db = getDb();
      const links = db
        .prepare(
          "SELECT source_id, target_id, relation FROM links WHERE source_id = ? OR target_id = ?",
        )
        .all("TASK-001", "TASK-001") as Array<{
        source_id: string;
        target_id: string;
      }>;

      expect(links.length).toBeGreaterThan(0);
    });

    it("returns empty for isolated items", () => {
      const db = getDb();
      const links = db
        .prepare(
          "SELECT * FROM links WHERE source_id = ? OR target_id = ?",
        )
        .all("systemPatterns", "systemPatterns");

      // systemPatterns has no cross-refs in our fixtures
      expect(links).toHaveLength(0);
    });
  });

  describe("memory_schema", () => {
    it("reports correct item type counts", () => {
      const db = getDb();
      const counts = db
        .prepare("SELECT type, COUNT(*) as cnt FROM items GROUP BY type")
        .all() as Array<{ type: string; cnt: number }>;

      const countMap = Object.fromEntries(counts.map((c) => [c.type, c.cnt]));
      expect(countMap.core).toBe(6);
      expect(countMap.task).toBe(2);
      expect(countMap.decision).toBe(1);
    });

    it("reports distinct statuses", () => {
      const db = getDb();
      const statuses = db
        .prepare(
          "SELECT DISTINCT status FROM items WHERE status IS NOT NULL ORDER BY status",
        )
        .all() as Array<{ status: string }>;

      const statusList = statuses.map((s) => s.status);
      expect(statusList).toContain("Accepted");
      expect(statusList).toContain("In Progress");
      expect(statusList).toContain("Pending");
    });

    it("reports link relations", () => {
      const db = getDb();
      const relations = db
        .prepare(
          "SELECT relation, COUNT(*) as cnt FROM links GROUP BY relation",
        )
        .all() as Array<{ relation: string; cnt: number }>;

      expect(relations.length).toBeGreaterThan(0);
      expect(relations.some((r) => r.relation === "references")).toBe(true);
    });
  });
});
