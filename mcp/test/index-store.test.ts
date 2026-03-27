import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  initStore,
  getStore,
  addLinkToStore,
  removeLinkFromStore,
  reindexFile,
  generateExcerpt,
} from "../src/index-store.js";

const FIXTURES_SRC = path.resolve(
  import.meta.dirname,
  "fixtures",
  "memory-bank",
);

let FIXTURES_PATH: string;

// We need to reset the store module between tests.
// initStore sets a module-level singleton, so we must re-init each time.
function copyFixtures(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-store-"));
  fs.cpSync(FIXTURES_SRC, tmp, { recursive: true, filter: (src) => !src.includes(".mcp") });
  return tmp;
}

function cleanup(): void {
  if (FIXTURES_PATH && fs.existsSync(FIXTURES_PATH)) {
    fs.rmSync(FIXTURES_PATH, { recursive: true });
  }
}

describe("IndexStore", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
  });

  afterEach(() => {
    cleanup();
  });

  it("initializes store with all markdown files", () => {
    const store = initStore(FIXTURES_PATH);
    // 6 core + 2 tasks + 1 decision = 9 (excludes _index.md files)
    expect(store.items.size).toBe(9);
  });

  it("items have correct IDs", () => {
    const store = initStore(FIXTURES_PATH);
    const ids = Array.from(store.items.keys());
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
    const store = initStore(FIXTURES_PATH);

    expect(store.items.get("projectbrief")!.type).toBe("core");
    expect(store.items.get("TASK-001")!.type).toBe("task");
    expect(store.items.get("ADR-0001")!.type).toBe("decision");
  });

  it("extracts status from metadata", () => {
    const store = initStore(FIXTURES_PATH);

    expect(store.items.get("TASK-001")!.status).toBe("In Progress");
    expect(store.items.get("ADR-0001")!.status).toBe("Accepted");
    expect(store.items.get("projectbrief")!.status).toBeNull();
  });

  it("skips _index.md files", () => {
    const store = initStore(FIXTURES_PATH);
    expect(store.items.has("_index")).toBe(false);
  });

  it("auto-detects cross-reference links", () => {
    const store = initStore(FIXTURES_PATH);

    // activeContext references ADR-0001 and TASK-001
    const activeOutgoing = store.outgoing.get("activeContext") || [];
    const activeToAdr = activeOutgoing.find((l) => l.target === "ADR-0001");
    expect(activeToAdr).toBeDefined();
    expect(activeToAdr!.relation).toBe("references");

    const activeToTask = activeOutgoing.find((l) => l.target === "TASK-001");
    expect(activeToTask).toBeDefined();

    // TASK-001 references ADR-0001
    const taskOutgoing = store.outgoing.get("TASK-001") || [];
    const taskToAdr = taskOutgoing.find((l) => l.target === "ADR-0001");
    expect(taskToAdr).toBeDefined();

    // ADR-0001 references TASK-001
    const adrOutgoing = store.outgoing.get("ADR-0001") || [];
    const adrToTask = adrOutgoing.find((l) => l.target === "TASK-001");
    expect(adrToTask).toBeDefined();
  });

  it("re-indexes a single file without duplicating", () => {
    const store = initStore(FIXTURES_PATH);
    const countBefore = store.items.size;

    reindexFile(store, path.join(FIXTURES_PATH, "projectbrief.md"));

    expect(store.items.size).toBe(countBefore);
  });

  it("updates content when file is re-indexed", () => {
    const store = initStore(FIXTURES_PATH);
    const filePath = path.join(FIXTURES_PATH, "projectbrief.md");

    // Modify the file
    const original = fs.readFileSync(filePath, "utf-8");
    fs.writeFileSync(filePath, original + "\n\nAppended content for test.");

    reindexFile(store, filePath);

    const item = store.items.get("projectbrief")!;
    expect(item.content).toContain("Appended content for test");
  });

  it("getStore() returns initialized store", () => {
    initStore(FIXTURES_PATH);
    const store = getStore();
    expect(store.items.size).toBeGreaterThan(0);
  });
});

describe("MiniSearch", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
  });

  afterEach(() => {
    cleanup();
  });

  it("supports basic text search", () => {
    const store = initStore(FIXTURES_PATH);
    const results = store.search.search("SQLite");

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "ADR-0001")).toBe(true);
  });

  it("supports AND queries", () => {
    const store = initStore(FIXTURES_PATH);
    // MiniSearch doesn't support "AND" keyword directly, but we can search for multiple terms
    const results = store.search.search("MCP server");

    expect(results.length).toBeGreaterThan(0);
  });

  it("handles no results gracefully", () => {
    const store = initStore(FIXTURES_PATH);
    const results = store.search.search("xyznonexistenttermxyz");

    expect(results).toHaveLength(0);
  });

  it("supports prefix queries", () => {
    const store = initStore(FIXTURES_PATH);
    const results = store.search.search("SQL", { prefix: true });

    expect(results.length).toBeGreaterThan(0);
  });
});

describe("generateExcerpt", () => {
  it("highlights matching terms", () => {
    const content = "This document discusses SQLite and its FTS5 capabilities for full-text search.";
    const excerpt = generateExcerpt(content, "SQLite");

    expect(excerpt).toContain(">>>");
    expect(excerpt).toContain("<<<");
    expect(excerpt).toContain("SQLite");
  });

  it("shows context around match", () => {
    const content = "A".repeat(100) + "important keyword here" + "B".repeat(100);
    const excerpt = generateExcerpt(content, "keyword");

    expect(excerpt).toContain("keyword");
    expect(excerpt.length).toBeLessThan(content.length);
  });

  it("handles no match gracefully", () => {
    const content = "Some content without the search term.";
    const excerpt = generateExcerpt(content, "nonexistent");

    // Should still return content from beginning
    expect(excerpt.length).toBeGreaterThan(0);
  });
});

describe("LinkOperations", () => {
  beforeEach(() => {
    cleanup();
    FIXTURES_PATH = copyFixtures();
  });

  afterEach(() => {
    cleanup();
  });

  it("creates a new link", () => {
    const store = initStore(FIXTURES_PATH);
    const added = addLinkToStore(store, "TASK-002", "ADR-0001", "implements");

    expect(added).toBe(true);
    const outLinks = store.outgoing.get("TASK-002") || [];
    expect(outLinks.some((l) => l.target === "ADR-0001" && l.relation === "implements")).toBe(true);

    const inLinks = store.incoming.get("ADR-0001") || [];
    expect(inLinks.some((l) => l.source === "TASK-002" && l.relation === "implements")).toBe(true);
  });

  it("prevents duplicate links", () => {
    const store = initStore(FIXTURES_PATH);
    addLinkToStore(store, "TASK-001", "ADR-0001", "test-dedup");
    const second = addLinkToStore(store, "TASK-001", "ADR-0001", "test-dedup");

    expect(second).toBe(false);
  });

  it("deletes an existing link", () => {
    const store = initStore(FIXTURES_PATH);
    addLinkToStore(store, "TASK-001", "ADR-0001", "test-delete");

    const removed = removeLinkFromStore(store, "TASK-001", "ADR-0001", "test-delete");
    expect(removed).toBe(true);

    const outLinks = store.outgoing.get("TASK-001") || [];
    expect(outLinks.some((l) => l.relation === "test-delete")).toBe(false);
  });

  it("returns false for non-existent link", () => {
    const store = initStore(FIXTURES_PATH);
    const removed = removeLinkFromStore(store, "TASK-999", "ADR-9999", "nonexistent");

    expect(removed).toBe(false);
  });

  it("updates link relation via remove+add", () => {
    const store = initStore(FIXTURES_PATH);
    addLinkToStore(store, "TASK-001", "ADR-0001", "old-rel");

    const removed = removeLinkFromStore(store, "TASK-001", "ADR-0001", "old-rel");
    expect(removed).toBe(true);

    const added = addLinkToStore(store, "TASK-001", "ADR-0001", "new-rel");
    expect(added).toBe(true);

    const outLinks = store.outgoing.get("TASK-001") || [];
    expect(outLinks.some((l) => l.relation === "old-rel")).toBe(false);
    expect(outLinks.some((l) => l.target === "ADR-0001" && l.relation === "new-rel")).toBe(true);
  });
});
