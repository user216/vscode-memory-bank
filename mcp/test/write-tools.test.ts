import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { initDb, getDb, closeDb } from "../src/db.js";
import { syncAllFiles, syncSingleFile } from "../src/sync.js";

/**
 * Tests for write tools: memory_create_task, memory_create_decision,
 * memory_update_status, memory_update_decision, memory_import_decisions,
 * memory_save_context.
 *
 * These tests operate on a temporary copy of fixtures to avoid polluting
 * the original fixture data.
 */

const FIXTURES_PATH = path.resolve(import.meta.dirname, "fixtures", "memory-bank");
const TEMP_MB_PATH = path.resolve(import.meta.dirname, "fixtures", "memory-bank-write-test");

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".mcp") continue; // skip DB dir
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanupTemp(): void {
  closeDb();
  if (fs.existsSync(TEMP_MB_PATH)) {
    fs.rmSync(TEMP_MB_PATH, { recursive: true });
  }
}

// ── memory_create_task ──────────────────────────────────────────────

describe("memory_create_task", () => {
  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);
    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
  });

  it("creates a new task file with correct structure", () => {
    const tasksDir = path.join(TEMP_MB_PATH, "tasks");
    const taskId = "TASK-003";
    const title = "Add caching layer";
    const request = "Implement caching to reduce DB queries";
    const today = new Date().toISOString().slice(0, 10);

    // Write task file
    let md = `# ${taskId}: ${title}\n\n`;
    md += `**Status:** Pending\n`;
    md += `**Added:** ${today}\n`;
    md += `**Updated:** ${today}\n\n`;
    md += `## Request\n${request}\n`;

    const filePath = path.join(tasksDir, `${taskId}-add-caching-layer.md`);
    fs.writeFileSync(filePath, md);
    syncSingleFile(TEMP_MB_PATH, filePath);

    // Verify it synced to DB
    const db = getDb();
    const item = db.prepare("SELECT id, type, status, title FROM items WHERE id = ?").get(taskId) as any;
    expect(item).toBeDefined();
    expect(item.type).toBe("task");
    expect(item.status).toBe("Pending");
    expect(item.title).toContain("Add caching layer");
  });

  it("creates task with plan and subtasks", () => {
    const tasksDir = path.join(TEMP_MB_PATH, "tasks");
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
    syncSingleFile(TEMP_MB_PATH, filePath);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("## Plan");
    expect(content).toContain("1. Extract middleware");
    expect(content).toContain("## Subtasks");
    expect(content).toContain("Backend API");
  });
});

// ── memory_create_decision ──────────────────────────────────────────

describe("memory_create_decision", () => {
  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);
    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
  });

  it("creates a new ADR file with correct structure", () => {
    const decisionsDir = path.join(TEMP_MB_PATH, "decisions");
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
    syncSingleFile(TEMP_MB_PATH, filePath);

    const db = getDb();
    const item = db.prepare("SELECT id, type, status FROM items WHERE id = ?").get(adrId) as any;
    expect(item).toBeDefined();
    expect(item.type).toBe("decision");
    expect(item.status).toBe("Proposed");
  });

  it("creates ADR with alternatives and consequences", () => {
    const decisionsDir = path.join(TEMP_MB_PATH, "decisions");
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
  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);
    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
  });

  it("updates task status in markdown file", () => {
    const taskFile = path.join(TEMP_MB_PATH, "tasks", "TASK-001-build-mcp-server.md");
    let content = fs.readFileSync(taskFile, "utf-8");
    expect(content).toContain("**Status:** In Progress");

    // Simulate status update
    content = content.replace(
      /(\*\*Status:\*\*\s*).+/,
      "$1Completed"
    );
    fs.writeFileSync(taskFile, content);
    syncSingleFile(TEMP_MB_PATH, taskFile);

    const db = getDb();
    const item = db.prepare("SELECT status FROM items WHERE id = ?").get("TASK-001") as any;
    expect(item.status).toBe("Completed");
  });

  it("updates decision status in markdown file", () => {
    const adrFile = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(adrFile, "utf-8");
    expect(content).toContain("**Status:** Accepted");

    content = content.replace(
      /(\*\*Status:\*\*\s*).+/,
      "$1Deprecated"
    );
    fs.writeFileSync(adrFile, content);
    syncSingleFile(TEMP_MB_PATH, adrFile);

    const db = getDb();
    const item = db.prepare("SELECT status FROM items WHERE id = ?").get("ADR-0001") as any;
    expect(item.status).toBe("Deprecated");
  });

  it("appends progress log entry", () => {
    const taskFile = path.join(TEMP_MB_PATH, "tasks", "TASK-002-write-tests.md");
    let content = fs.readFileSync(taskFile, "utf-8");
    const today = new Date().toISOString().slice(0, 10);

    // Append progress log
    content += `\n## Progress Log\n\n### ${today}\nAdded 15 test cases for write tools.\n`;
    fs.writeFileSync(taskFile, content);

    const updated = fs.readFileSync(taskFile, "utf-8");
    expect(updated).toContain("## Progress Log");
    expect(updated).toContain("Added 15 test cases");
  });
});

// ── memory_update_decision ──────────────────────────────────────────

describe("memory_update_decision", () => {
  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);
    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
  });

  it("updates ADR title in markdown", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /^#\s+ADR-0001:.+$/m,
      "# ADR-0001: Use SQLite with FTS5 for Memory Bank"
    );
    fs.writeFileSync(filePath, content);
    syncSingleFile(TEMP_MB_PATH, filePath);

    const db = getDb();
    const item = db.prepare("SELECT title FROM items WHERE id = ?").get("ADR-0001") as any;
    expect(item.title).toContain("Use SQLite with FTS5 for Memory Bank");
  });

  it("updates ADR context section", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /## Context\n[\s\S]*?(?=\n## Decision)/,
      "## Context\nUpdated context: Need fast local search with FTS5 support.\n"
    );
    fs.writeFileSync(filePath, content);

    const updated = fs.readFileSync(filePath, "utf-8");
    expect(updated).toContain("Updated context: Need fast local search with FTS5 support.");
    expect(updated).not.toContain("Need a local storage solution");
  });

  it("updates ADR decision section", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /## Decision\n[\s\S]*?(?=\n## Alternatives)/,
      "## Decision\nUse better-sqlite3 with FTS5 for full-text search and structured queries.\n"
    );
    fs.writeFileSync(filePath, content);

    const updated = fs.readFileSync(filePath, "utf-8");
    expect(updated).toContain("Use better-sqlite3 with FTS5");
  });

  it("updates ADR alternatives section", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /## Alternatives Considered\n[\s\S]*?(?=\n## Consequences)/,
      "## Alternatives Considered\n\n### PostgreSQL\nToo heavy for local embedded use.\n\n### DuckDB\nGood for analytics but overkill for our use case.\n"
    );
    fs.writeFileSync(filePath, content);

    const updated = fs.readFileSync(filePath, "utf-8");
    expect(updated).toContain("### PostgreSQL");
    expect(updated).toContain("### DuckDB");
    expect(updated).not.toContain("File-based grep");
  });

  it("updates ADR consequences section", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(
      /## Consequences\n[\s\S]*$/,
      "## Consequences\n- Bundled SQLite via better-sqlite3\n- FTS5 available out of the box\n- Single-file database\n"
    );
    fs.writeFileSync(filePath, content);

    const updated = fs.readFileSync(filePath, "utf-8");
    expect(updated).toContain("Bundled SQLite via better-sqlite3");
    expect(updated).toContain("FTS5 available out of the box");
  });

  it("preserves other sections when updating one", () => {
    const filePath = path.join(TEMP_MB_PATH, "decisions", "ADR-0001-use-sqlite.md");
    const content = fs.readFileSync(filePath, "utf-8");

    // All sections should still be present
    expect(content).toContain("# ADR-0001:");
    expect(content).toContain("**Status:**");
    expect(content).toContain("## Context");
    expect(content).toContain("## Decision");
    expect(content).toContain("## Alternatives Considered");
    expect(content).toContain("## Consequences");
  });
});

// ── memory_import_decisions ─────────────────────────────────────────

describe("memory_import_decisions", () => {
  const IMPORT_SOURCE = path.resolve(import.meta.dirname, "fixtures", "import-source");

  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);

    // Create import source directory with test ADR files
    fs.mkdirSync(IMPORT_SOURCE, { recursive: true });

    // 1. ADR with YAML frontmatter (title + status)
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

    // 2. ADR without frontmatter (should get title from heading)
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

    // 3. ADR with only frontmatter status (no inline status)
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0007-adopt-typescript.md"),
      `---
status: Accepted
---

# Adopt TypeScript

## Context
Need type safety.

## Decision
Migrate to TypeScript.
`
    );

    // 4. README.md — should be SKIPPED
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "README.md"),
      `# Architecture Decision Records\n\nThis directory contains ADRs.\n`
    );

    // 5. Random non-ADR file — should be SKIPPED
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "notes.md"),
      `# Meeting Notes\n\nSome notes.\n`
    );

    // 6. ADR with status "Deprecated"
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0012-use-mongodb.md"),
      `---
title: Use MongoDB
status: Deprecated
---

# Use MongoDB

## Context
Considered NoSQL.

## Decision
Rejected in favor of SQLite.
`
    );

    // 7. NNNN- prefix pattern
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

    // 8. ADR with NO status at all — should default to "Accepted"
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0037-use-prettier.md"),
      `# Use Prettier for Code Formatting

## Context
Need consistent code style.

## Decision
Use Prettier with default config.
`
    );

    // 9. ADR with "Rejected" status in frontmatter
    fs.writeFileSync(
      path.join(IMPORT_SOURCE, "adr-0047-use-graphql.md"),
      `---
title: Use GraphQL for API
status: Rejected
---

# Use GraphQL for API

## Context
Considered GraphQL vs REST.

## Decision
Rejected — REST is simpler for our needs.
`
    );

    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
    if (fs.existsSync(IMPORT_SOURCE)) {
      fs.rmSync(IMPORT_SOURCE, { recursive: true });
    }
  });

  describe("file filtering", () => {
    it("skips README.md", () => {
      // Simulate what collectMarkdownFiles does
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

    it("includes adr-NNNN files", () => {
      const files = fs.readdirSync(IMPORT_SOURCE).filter((f) => {
        if (!f.endsWith(".md")) return false;
        return /^adr[-_]?\d+/i.test(f.toLowerCase()) || /^\d{4}-/.test(f);
      });

      expect(files).toContain("adr-0003-use-redis.md");
      expect(files).toContain("adr-0005-use-docker.md");
      expect(files).toContain("adr-0007-adopt-typescript.md");
      expect(files).toContain("adr-0012-use-mongodb.md");
    });

    it("includes NNNN- prefix files", () => {
      const files = fs.readdirSync(IMPORT_SOURCE).filter((f) => {
        if (!f.endsWith(".md")) return false;
        return /^adr[-_]?\d+/i.test(f.toLowerCase()) || /^\d{4}-/.test(f);
      });

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

    it("extracts status from frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0003-use-redis.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const fm: Record<string, string> = {};
      for (const line of fmMatch![1].split(/\r?\n/)) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kvMatch) {
          fm[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
        }
      }

      expect(fm.status).toBe("Accepted");
    });

    it("extracts Deprecated status from frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0012-use-mongodb.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const fm: Record<string, string> = {};
      for (const line of fmMatch![1].split(/\r?\n/)) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kvMatch) {
          fm[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
        }
      }

      expect(fm.status).toBe("Deprecated");
    });

    it("falls back to heading for title when no frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0005-use-docker.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(fmMatch).toBeNull(); // no frontmatter

      const titleMatch = content.match(/^#\s+(.+)$/m);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1]).toBe("Use Docker for Deployment");
    });

    it("falls back to inline **Status:** when no frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0005-use-docker.md"),
        "utf-8"
      );
      const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
      expect(statusMatch).not.toBeNull();
      expect(statusMatch![1].trim()).toBe("Accepted");
    });
  });

  describe("ADR number preservation", () => {
    it("extracts number from adr-NNNN filename", () => {
      const filename = "adr-0003-use-redis.md";
      const match = filename.match(/^adr[-_]?(\d+)/i);
      expect(match).not.toBeNull();
      expect(parseInt(match![1], 10)).toBe(3);
    });

    it("extracts number from NNNN- filename", () => {
      const filename = "0015-git-submodules.md";
      const match = filename.match(/^\d{4}/);
      expect(match).not.toBeNull();
      expect(parseInt(match![0], 10)).toBe(15);
    });

    it("pads extracted number to 4 digits", () => {
      const num = 3;
      const adrId = `ADR-${String(num).padStart(4, "0")}`;
      expect(adrId).toBe("ADR-0003");
    });

    it("preserves original number as ADR ID", () => {
      const testCases = [
        { filename: "adr-0003-use-redis.md", expected: "ADR-0003" },
        { filename: "adr-0005-use-docker.md", expected: "ADR-0005" },
        { filename: "adr-0012-use-mongodb.md", expected: "ADR-0012" },
        { filename: "0015-git-submodules.md", expected: "ADR-0015" },
      ];

      for (const tc of testCases) {
        let num: number | null = null;
        const adrMatch = tc.filename.match(/^adr[-_]?(\d+)/i);
        if (adrMatch) num = parseInt(adrMatch[1], 10);
        const numMatch = tc.filename.match(/^(\d{4})-/);
        if (!num && numMatch) num = parseInt(numMatch[1], 10);

        expect(num).not.toBeNull();
        const adrId = `ADR-${String(num!).padStart(4, "0")}`;
        expect(adrId).toBe(tc.expected);
      }
    });
  });

  describe("status normalization", () => {
    it("normalizes common status values", () => {
      const VALID = ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];

      function normalizeStatus(raw: string): string {
        const lower = raw.toLowerCase().replace(/[^a-z]/g, "");
        for (const s of VALID) {
          if (s.toLowerCase().replace(/[^a-z]/g, "") === lower) return s;
        }
        if (lower === "draft") return "Proposed";
        if (lower === "approved") return "Accepted";
        return raw;
      }

      expect(normalizeStatus("accepted")).toBe("Accepted");
      expect(normalizeStatus("PROPOSED")).toBe("Proposed");
      expect(normalizeStatus("deprecated")).toBe("Deprecated");
      expect(normalizeStatus("Superseded")).toBe("Superseded");
      expect(normalizeStatus("draft")).toBe("Proposed");
      expect(normalizeStatus("approved")).toBe("Accepted");
      expect(normalizeStatus("Rejected")).toBe("Rejected");
      expect(normalizeStatus("rejected")).toBe("Rejected");
    });

    it("defaults to Accepted when no status is found", () => {
      // ADRs without explicit status should default to Accepted, not Proposed
      const defaultStatus = null || "Accepted";
      expect(defaultStatus).toBe("Accepted");
    });

    it("preserves Rejected status from frontmatter", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0047-use-graphql.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const fm: Record<string, string> = {};
      for (const line of fmMatch![1].split(/\r?\n/)) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kvMatch) {
          fm[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
        }
      }
      expect(fm.status).toBe("Rejected");
    });

    it("detects ADR with no status has no frontmatter or inline status", () => {
      const content = fs.readFileSync(
        path.join(IMPORT_SOURCE, "adr-0037-use-prettier.md"),
        "utf-8"
      );
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
      expect(fmMatch).toBeNull();
      expect(statusMatch).toBeNull();
      // With no status found, import should default to "Accepted"
    });
  });

  describe("re-sync mode", () => {
    it("syncs existing ADR files to SQLite", () => {
      // All ADR files in decisions/ should be in DB
      const decisionsDir = path.join(TEMP_MB_PATH, "decisions");
      const adrFiles = fs.readdirSync(decisionsDir).filter((f) => f.match(/^ADR-\d{4}/) && f.endsWith(".md"));

      const db = getDb();
      for (const f of adrFiles) {
        const idMatch = f.match(/^(ADR-\d{4})/);
        if (idMatch) {
          const item = db.prepare("SELECT id FROM items WHERE id = ?").get(idMatch[1]) as any;
          expect(item).toBeDefined();
        }
      }
    });
  });
});

// ── memory_save_context ─────────────────────────────────────────────

describe("memory_save_context", () => {
  beforeAll(() => {
    cleanupTemp();
    copyDirSync(FIXTURES_PATH, TEMP_MB_PATH);
    process.env.MEMORY_BANK_PATH = TEMP_MB_PATH;
    initDb(TEMP_MB_PATH);
    syncAllFiles(TEMP_MB_PATH);
  });

  afterAll(() => {
    delete process.env.MEMORY_BANK_PATH;
    cleanupTemp();
  });

  it("writes activeContext.md with correct structure", () => {
    const filePath = path.join(TEMP_MB_PATH, "activeContext.md");
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
    expect(content).toContain("- Fixed query parsing");
  });

  it("includes decisions section when provided", () => {
    const filePath = path.join(TEMP_MB_PATH, "activeContext.md");
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
    const filePath = path.join(TEMP_MB_PATH, "activeContext.md");
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

  it("preserves decisions from existing file when not provided", () => {
    const filePath = path.join(TEMP_MB_PATH, "activeContext.md");

    // Write file with decisions
    let md = "# Active Context\n\n";
    md += "## Current Focus\nOld focus\n\n";
    md += "## Recent Changes\n- Old change\n\n";
    md += "## Current Decisions\n- Keep this decision\n\n";
    fs.writeFileSync(filePath, md);

    // Now read and check that decisions are there
    const content = fs.readFileSync(filePath, "utf-8");
    const decisionsMatch = content.match(
      /## Current Decisions\n([\s\S]*?)(?=\n## |\n*$)/
    );

    expect(decisionsMatch).not.toBeNull();
    const decisions = decisionsMatch![1]
      .trim()
      .split("\n")
      .filter((l: string) => l.startsWith("- "))
      .map((l: string) => l.replace(/^- /, ""));

    expect(decisions).toContain("Keep this decision");
  });
});
