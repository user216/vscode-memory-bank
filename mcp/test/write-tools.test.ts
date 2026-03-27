import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { initStore, reindexFile } from "../src/index-store.js";
import type { IndexStore } from "../src/index-store.js";

/**
 * Tests for write tools: memory_create_task, memory_create_decision,
 * memory_update_status, memory_update_decision, memory_import_decisions,
 * memory_save_context.
 *
 * These tests operate on a temporary copy of fixtures.
 */

const FIXTURES_SRC = path.resolve(import.meta.dirname, "fixtures", "memory-bank");

function copyFixtures(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-write-"));
  fs.cpSync(FIXTURES_SRC, tmp, { recursive: true, filter: (src) => !src.includes(".mcp") });
  return tmp;
}

// ── memory_create_task ──────────────────────────────────────────────

describe("memory_create_task", () => {
  let tmpPath: string;
  let store: IndexStore;

  beforeAll(() => {
    tmpPath = copyFixtures();
    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
  });

  it("creates a new task file with correct structure", () => {
    const tasksDir = path.join(tmpPath, "tasks");
    const taskId = "TASK-003";
    const title = "Add caching layer";
    const request = "Implement caching to reduce DB queries";
    const today = new Date().toISOString().slice(0, 10);

    let md = `# ${taskId}: ${title}\n\n`;
    md += `**Status:** Pending\n`;
    md += `**Added:** ${today}\n`;
    md += `**Updated:** ${today}\n\n`;
    md += `## Request\n${request}\n`;

    const filePath = path.join(tasksDir, `${taskId}-add-caching-layer.md`);
    fs.writeFileSync(filePath, md);
    reindexFile(store, filePath);

    const item = store.items.get(taskId);
    expect(item).toBeDefined();
    expect(item!.type).toBe("task");
    expect(item!.status).toBe("Pending");
    expect(item!.title).toContain("Add caching layer");
  });

  it("creates task with plan and subtasks", () => {
    const tasksDir = path.join(tmpPath, "tasks");
    const taskId = "TASK-004";
    const today = new Date().toISOString().slice(0, 10);

    let md = `# ${taskId}: Refactor auth\n\n`;
    md += `**Status:** Pending\n`;
    md += `**Added:** ${today}\n`;
    md += `**Updated:** ${today}\n\n`;
    md += `## Request\nRefactor authentication module\n\n`;
    md += `## Plan\n1. Extract middleware\n2. Add JWT support\n3. Write tests\n\n`;
    md += `## Subtasks\n| # | Subtask | Status |\n|---|---------|--------|\n`;
    md += `| 1 | Backend API | Pending |\n`;
    md += `| 2 | Frontend form | Pending |\n`;

    const filePath = path.join(tasksDir, `${taskId}-refactor-auth.md`);
    fs.writeFileSync(filePath, md);
    reindexFile(store, filePath);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("## Plan");
    expect(content).toContain("1. Extract middleware");
    expect(content).toContain("## Subtasks");
    expect(content).toContain("Backend API");
  });
});

// ── memory_create_decision ──────────────────────────────────────────

describe("memory_create_decision", () => {
  let tmpPath: string;
  let store: IndexStore;

  beforeAll(() => {
    tmpPath = copyFixtures();
    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
  });

  it("creates a new ADR file with correct structure", () => {
    const decisionsDir = path.join(tmpPath, "decisions");
    const adrId = "ADR-0002";
    const title = "Use React for frontend";
    const today = new Date().toISOString().slice(0, 10);

    let md = `# ${adrId}: ${title}\n\n`;
    md += `**Status:** Proposed\n`;
    md += `**Date:** ${today}\n`;
    md += `**Deciders:** Team lead\n\n`;
    md += `## Context\nNeed a frontend framework.\n\n`;
    md += `## Decision\nUse React for its ecosystem.\n\n`;
    md += `## Alternatives Considered\n\n### Vue\nGood but smaller ecosystem.\n\n`;
    md += `## Consequences\n- Team needs React training\n`;

    const filePath = path.join(decisionsDir, `${adrId}-use-react.md`);
    fs.writeFileSync(filePath, md);
    reindexFile(store, filePath);

    const item = store.items.get(adrId);
    expect(item).toBeDefined();
    expect(item!.type).toBe("decision");
    expect(item!.status).toBe("Proposed");
  });

  it("creates ADR with alternatives and consequences", () => {
    const decisionsDir = path.join(tmpPath, "decisions");
    const content = fs.readFileSync(
      path.join(decisionsDir, "ADR-0002-use-react.md"),
      "utf-8"
    );

    expect(content).toContain("## Alternatives Considered");
    expect(content).toContain("### Vue");
    expect(content).toContain("## Consequences");
    expect(content).toContain("Team needs React training");
  });
});

// ── memory_update_status ────────────────────────────────────────────

describe("memory_update_status", () => {
  let tmpPath: string;
  let store: IndexStore;

  beforeAll(() => {
    tmpPath = copyFixtures();
    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
  });

  it("updates task status in markdown file", () => {
    const taskFile = path.join(tmpPath, "tasks", "TASK-001-build-mcp-server.md");
    let content = fs.readFileSync(taskFile, "utf-8");
    expect(content).toContain("**Status:** In Progress");

    content = content.replace(/(\*\*Status:\*\*\s*).+/, "$1Completed");
    fs.writeFileSync(taskFile, content);
    reindexFile(store, taskFile);

    const item = store.items.get("TASK-001");
    expect(item!.status).toBe("Completed");
  });

  it("updates decision status in markdown file", () => {
    const adrFile = path.join(tmpPath, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(adrFile, "utf-8");
    expect(content).toContain("**Status:** Accepted");

    content = content.replace(/(\*\*Status:\*\*\s*).+/, "$1Deprecated");
    fs.writeFileSync(adrFile, content);
    reindexFile(store, adrFile);

    const item = store.items.get("ADR-0001");
    expect(item!.status).toBe("Deprecated");
  });

  it("appends progress log entry", () => {
    const taskFile = path.join(tmpPath, "tasks", "TASK-002-write-tests.md");
    let content = fs.readFileSync(taskFile, "utf-8");
    const today = new Date().toISOString().slice(0, 10);

    content += `\n## Progress Log\n\n### ${today}\nAdded 15 test cases for write tools.\n`;
    fs.writeFileSync(taskFile, content);

    const updated = fs.readFileSync(taskFile, "utf-8");
    expect(updated).toContain("## Progress Log");
    expect(updated).toContain("Added 15 test cases");
  });
});

// ── memory_update_decision ──────────────────────────────────────────

describe("memory_update_decision", () => {
  let tmpPath: string;
  let store: IndexStore;

  beforeAll(() => {
    tmpPath = copyFixtures();
    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
  });

  it("updates ADR title in markdown", () => {
    const filePath = path.join(tmpPath, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /^#\s+ADR-0001:.+$/m,
      "# ADR-0001: Use SQLite with FTS5 for Memory Bank"
    );
    fs.writeFileSync(filePath, content);
    reindexFile(store, filePath);

    const item = store.items.get("ADR-0001");
    expect(item!.title).toContain("Use SQLite with FTS5 for Memory Bank");
  });

  it("updates ADR context section", () => {
    const filePath = path.join(tmpPath, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /## Context\n[\s\S]*?(?=\n## Decision)/,
      "## Context\nUpdated context: Need fast local search with FTS5 support.\n"
    );
    fs.writeFileSync(filePath, content);

    const updated = fs.readFileSync(filePath, "utf-8");
    expect(updated).toContain("Updated context: Need fast local search with FTS5 support.");
  });

  it("preserves other sections when updating one", () => {
    const filePath = path.join(tmpPath, "decisions", "ADR-0001-use-sqlite.md");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("# ADR-0001:");
    expect(content).toContain("**Status:**");
    expect(content).toContain("## Context");
    expect(content).toContain("## Decision");
  });
});

// ── memory_import_decisions ─────────────────────────────────────────

describe("memory_import_decisions", () => {
  let tmpPath: string;
  let store: IndexStore;
  const IMPORT_SOURCE = path.resolve(import.meta.dirname, "fixtures", "import-source");

  beforeAll(() => {
    tmpPath = copyFixtures();

    // Create import source directory with test ADR files
    fs.mkdirSync(IMPORT_SOURCE, { recursive: true });

    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0003-use-redis.md"),
      `---
title: Use Redis for Caching
status: Accepted
---

# Use Redis for Caching

## Context
Need a caching layer for API responses.

## Decision
Use Redis for its speed and built-in TTL support.
`
    );

    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0005-use-docker.md"),
      `# Use Docker for Deployment

**Status:** Accepted

## Context
Need consistent deployment environments.

## Decision
Use Docker containers.
`
    );

    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "README.md"),
      `# Architecture Decision Records\n\nThis directory contains ADRs.\n`
    );

    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "notes.md"),
      `# Meeting Notes\n\nSome notes.\n`
    );

    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "0015-git-submodules.md"),
      `---
title: Git Submodules for Shared Components
status: Accepted
---

# Git Submodules for Shared Components

## Context
Need to share code between repos.

## Decision
Use git submodules.
`
    );

    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
    if (fs.existsSync(IMPORT_SOURCE)) fs.rmSync(IMPORT_SOURCE, { recursive: true });
  });

  describe("file filtering", () => {
    it("skips README.md", () => {
      const files = fs.readdirSync(IMPORT_SOURCE).filter((f) => {
        if (!f.endsWith(".md")) return false;
        if (f.startsWith("_")) return false;
        return /^adr[-_]?\d+/i.test(f.toLowerCase()) || /^\d{4}-/.test(f);
      });

      expect(files).not.toContain("README.md");
    });

    it("skips non-ADR files like notes.md", () => {
      const files = fs.readdirSync(IMPORT_SOURCE).filter((f) => {
        if (!f.endsWith(".md")) return false;
        if (f.startsWith("_")) return false;
        return /^adr[-_]?\d+/i.test(f.toLowerCase()) || /^\d{4}-/.test(f);
      });

      expect(files).not.toContain("notes.md");
    });

    it("includes adr-NNNN and NNNN- files", () => {
      const files = fs.readdirSync(IMPORT_SOURCE).filter((f) => {
        if (!f.endsWith(".md")) return false;
        return /^adr[-_]?\d+/i.test(f.toLowerCase()) || /^\d{4}-/.test(f);
      });

      expect(files).toContain("adr-0003-use-redis.md");
      expect(files).toContain("adr-0005-use-docker.md");
      expect(files).toContain("0015-git-submodules.md");
    });
  });

  describe("YAML frontmatter parsing", () => {
    it("extracts title from frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0003-use-redis.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(fmMatch).not.toBeNull();

      const fm: Record<string, string> = {};
      for (const line of fmMatch![1].split(/\r?\n/)) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kvMatch) {
          fm[kvMatch[1].toLowerCase()] = kvMatch[2].trim().replace(/^["']|["']$/g, "");
        }
      }

      expect(fm.title).toBe("Use Redis for Caching");
    });

    it("falls back to heading for title when no frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0005-use-docker.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(fmMatch).toBeNull();

      const titleMatch = content.match(/^#\s+(.+)$/m);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1]).toBe("Use Docker for Deployment");
    });
  });

  describe("re-sync mode", () => {
    it("syncs existing ADR files to index", () => {
      const decisionsDir = path.join(tmpPath, "decisions");
      const adrFiles = fs.readdirSync(decisionsDir).filter((f) => f.match(/^ADR-\d{4}/) && f.endsWith(".md"));

      for (const f of adrFiles) {
        const idMatch = f.match(/^(ADR-\d{4})/);
        if (idMatch) {
          expect(store.items.has(idMatch[1])).toBe(true);
        }
      }
    });
  });
});

// ── memory_save_context ─────────────────────────────────────────────

describe("memory_save_context", () => {
  let tmpPath: string;
  let store: IndexStore;

  beforeAll(() => {
    tmpPath = copyFixtures();
    process.env.MEMORY_BANK_PATH = tmpPath;
    store = initStore(tmpPath);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true });
  });

  it("writes activeContext.md with correct structure", () => {
    const filePath = path.join(tmpPath, "activeContext.md");
    const focus = "Implementing FTS5 search";
    const changes = ["Added search tool", "Fixed query parsing"];

    let md = "# Active Context\n\n";
    md += `## Current Focus\n${focus}\n\n`;
    md += "## Recent Changes\n";
    for (const change of changes) {
      md += `- ${change}\n`;
    }
    md += "\n";

    fs.writeFileSync(filePath, md);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("# Active Context");
    expect(content).toContain("## Current Focus");
    expect(content).toContain("Implementing FTS5 search");
    expect(content).toContain("## Recent Changes");
    expect(content).toContain("- Added search tool");
  });

  it("includes decisions section when provided", () => {
    const filePath = path.join(tmpPath, "activeContext.md");
    const decisions = ["Use SQLite for storage", "Adopt FTS5 for search"];

    let md = "# Active Context\n\n";
    md += "## Current Focus\nTesting\n\n";
    md += "## Recent Changes\n- Test change\n\n";
    md += "## Current Decisions\n";
    for (const d of decisions) {
      md += `- ${d}\n`;
    }
    md += "\n";

    fs.writeFileSync(filePath, md);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("## Current Decisions");
    expect(content).toContain("- Use SQLite for storage");
  });

  it("includes next steps as numbered list", () => {
    const filePath = path.join(tmpPath, "activeContext.md");
    const nextSteps = ["Write more tests", "Deploy to production"];

    let md = "# Active Context\n\n";
    md += "## Current Focus\nTesting\n\n";
    md += "## Recent Changes\n- Ran tests\n\n";
    md += "## Next Steps\n";
    nextSteps.forEach((step, i) => {
      md += `${i + 1}. ${step}\n`;
    });
    md += "\n";

    fs.writeFileSync(filePath, md);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("## Next Steps");
    expect(content).toContain("1. Write more tests");
    expect(content).toContain("2. Deploy to production");
  });
});
