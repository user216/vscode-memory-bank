import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  initStore,
  addLinkToStore,
  removeLinkFromStore,
} from "../src/index-store.js";
import type { IndexStore } from "../src/index-store.js";

const FIXTURES_SRC = path.resolve(
  import.meta.dirname,
  "fixtures",
  "memory-bank",
);

let FIXTURES_PATH: string;
let store: IndexStore;

function copyFixtures(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-tools-"));
  fs.cpSync(FIXTURES_SRC, tmp, { recursive: true, filter: (src) => !src.includes(".mcp") });
  return tmp;
}

describe("Tool Integration Tests", () => {
  beforeAll(() => {
    FIXTURES_PATH = copyFixtures();
    store = initStore(FIXTURES_PATH);
  });

  afterAll(() => {
    if (FIXTURES_PATH && fs.existsSync(FIXTURES_PATH)) {
      fs.rmSync(FIXTURES_PATH, { recursive: true });
    }
  });

  describe("memory_search", () => {
    it("finds items by keyword", () => {
      const results = store.search.search("SQLite");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === "ADR-0001")).toBe(true);
    });

    it("filters by type after search", () => {
      const results = store.search.search("server");
      const filtered = results.filter((r) => {
        const item = store.items.get(r.id);
        return item?.type === "task";
      });

      for (const r of filtered) {
        expect(store.items.get(r.id)!.type).toBe("task");
      }
    });
  });

  describe("memory_query", () => {
    it("queries by type", () => {
      const decisions = Array.from(store.items.values()).filter((i) => i.type === "decision");

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions.every((d) => d.type === "decision")).toBe(true);
    });

    it("queries by status", () => {
      const inProgress = Array.from(store.items.values()).filter((i) => i.status === "In Progress");

      expect(inProgress.length).toBeGreaterThan(0);
      expect(inProgress.some((i) => i.id === "TASK-001")).toBe(true);
    });

    it("queries by type AND status", () => {
      const results = Array.from(store.items.values()).filter(
        (i) => i.type === "decision" && i.status === "Accepted",
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("ADR-0001");
    });

    it("returns empty array for no matches", () => {
      const results = Array.from(store.items.values()).filter((i) => i.status === "NonExistentStatus");
      expect(results).toHaveLength(0);
    });
  });

  describe("memory_recall", () => {
    it("returns items within token budget", () => {
      const items = Array.from(store.items.values());
      const CHARS_PER_TOKEN = 3.5;
      const budget = 500;
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
      const items = Array.from(store.items.values());

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
      const items = Array.from(store.items.values());

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
      const inProgressIdx = sorted.findIndex((i) => i.id === "TASK-001");
      const pendingIdx = sorted.findIndex((i) => i.id === "TASK-002");
      expect(inProgressIdx).toBeLessThan(pendingIdx);
    });
  });

  describe("memory_link", () => {
    it("creates a new link", () => {
      const added = addLinkToStore(store, "TASK-002", "ADR-0001", "implements");
      expect(added).toBe(true);

      const outLinks = store.outgoing.get("TASK-002") || [];
      expect(outLinks.some((l) => l.target === "ADR-0001" && l.relation === "implements")).toBe(true);
    });

    it("prevents duplicate links", () => {
      addLinkToStore(store, "TASK-001", "ADR-0001", "test-dedup");
      const second = addLinkToStore(store, "TASK-001", "ADR-0001", "test-dedup");
      expect(second).toBe(false);
    });
  });

  describe("memory_unlink", () => {
    it("deletes an existing link", () => {
      addLinkToStore(store, "TASK-001", "ADR-0001", "test-delete");
      const removed = removeLinkFromStore(store, "TASK-001", "ADR-0001", "test-delete");
      expect(removed).toBe(true);
    });

    it("returns false for non-existent link", () => {
      const removed = removeLinkFromStore(store, "TASK-999", "ADR-9999", "nonexistent");
      expect(removed).toBe(false);
    });
  });

  describe("memory_update_link", () => {
    it("updates the relation type of an existing link", () => {
      addLinkToStore(store, "TASK-001", "ADR-0001", "test-old-rel");

      const removed = removeLinkFromStore(store, "TASK-001", "ADR-0001", "test-old-rel");
      expect(removed).toBe(true);

      const added = addLinkToStore(store, "TASK-001", "ADR-0001", "test-new-rel");
      expect(added).toBe(true);

      const outLinks = store.outgoing.get("TASK-001") || [];
      expect(outLinks.some((l) => l.relation === "test-old-rel")).toBe(false);
      expect(outLinks.some((l) => l.target === "ADR-0001" && l.relation === "test-new-rel")).toBe(true);

      // Cleanup
      removeLinkFromStore(store, "TASK-001", "ADR-0001", "test-new-rel");
    });
  });

  describe("memory_graph", () => {
    it("finds outgoing links from an item", () => {
      const outLinks = store.outgoing.get("activeContext") || [];
      expect(outLinks.length).toBeGreaterThan(0);
      expect(outLinks.some((l) => l.target === "ADR-0001")).toBe(true);
    });

    it("finds incoming links to an item", () => {
      const inLinks = store.incoming.get("ADR-0001") || [];
      expect(inLinks.length).toBeGreaterThan(0);
    });

    it("finds bidirectional links", () => {
      const outLinks = store.outgoing.get("TASK-001") || [];
      const inLinks = store.incoming.get("TASK-001") || [];
      const totalLinks = outLinks.length + inLinks.length;
      expect(totalLinks).toBeGreaterThan(0);
    });

    it("returns empty for isolated items", () => {
      const outLinks = store.outgoing.get("systemPatterns") || [];
      const inLinks = store.incoming.get("systemPatterns") || [];
      expect(outLinks.length + inLinks.length).toBe(0);
    });
  });

  describe("memory_schema", () => {
    it("reports correct item type counts", () => {
      const typeCounts: Record<string, number> = {};
      for (const item of store.items.values()) {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      }

      expect(typeCounts.core).toBe(6);
      expect(typeCounts.task).toBe(2);
      expect(typeCounts.decision).toBe(1);
    });

    it("reports distinct statuses", () => {
      const statusSet = new Set<string>();
      for (const item of store.items.values()) {
        if (item.status) statusSet.add(item.status);
      }

      expect(statusSet.has("Accepted")).toBe(true);
      expect(statusSet.has("In Progress")).toBe(true);
      expect(statusSet.has("Pending")).toBe(true);
    });

    it("reports link relations", () => {
      const relationCounts: Record<string, number> = {};
      for (const links of store.outgoing.values()) {
        for (const link of links) {
          relationCounts[link.relation] = (relationCounts[link.relation] || 0) + 1;
        }
      }

      expect(Object.keys(relationCounts).length).toBeGreaterThan(0);
      expect(relationCounts["references"]).toBeGreaterThan(0);
    });
  });
});
