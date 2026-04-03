import { describe, it, expect } from "vitest";
import {
  deriveId,
  deriveType,
  deriveTitle,
  extractMetadata,
  extractSections,
  extractCrossRefs,
  parseMarkdownFile,
  isIndexFile,
  extractStatus,
} from "../src/parser.js";

describe("deriveId", () => {
  it("extracts task ID from filename", () => {
    expect(deriveId("tasks/TASK-001-build-mcp-server.md")).toBe("TASK-001");
  });

  it("extracts ADR ID from filename", () => {
    expect(deriveId("decisions/ADR-0001-use-sqlite.md")).toBe("ADR-0001");
  });

  it("extracts NOTE ID from filename (legacy — treated as plain stem)", () => {
    expect(deriveId("NOTE-001-api-patterns.md")).toBe("NOTE-001-api-patterns");
  });

  it("uses full stem for core files", () => {
    expect(deriveId("projectbrief.md")).toBe("projectbrief");
    expect(deriveId("activeContext.md")).toBe("activeContext");
  });

  it("handles nested paths", () => {
    expect(deriveId("memory-bank/tasks/TASK-042-something.md")).toBe(
      "TASK-042",
    );
  });
});

describe("deriveType", () => {
  it('returns "task" for files in tasks/ directory', () => {
    expect(deriveType("tasks/TASK-001-foo.md")).toBe("task");
  });

  it('returns "decision" for files in decisions/ directory', () => {
    expect(deriveType("decisions/ADR-0001-foo.md")).toBe("decision");
  });

  it('returns "core" only for projectbrief (ADR-0015 §7)', () => {
    expect(deriveType("projectbrief.md")).toBe("core");
  });

  it('returns "structure" for eliminated v1 core files (ADR-0025)', () => {
    expect(deriveType("activeContext.md")).toBe("structure");
    expect(deriveType("progress.md")).toBe("structure");
    expect(deriveType("productContext.md")).toBe("structure");
    expect(deriveType("systemPatterns.md")).toBe("structure");
    expect(deriveType("techContext.md")).toBe("structure");
  });

  it('returns "structure" for README.md', () => {
    expect(deriveType("README.md")).toBe("structure");
  });

  it('returns "structure" for unknown root-level files', () => {
    expect(deriveType("random.md")).toBe("structure");
  });

  it('returns type from frontmatter when provided', () => {
    expect(deriveType("some-file.md", "task")).toBe("task");
    expect(deriveType("some-file.md", "decision")).toBe("decision");
  });

  it('returns "structure" for NOTE-NNN files in flat layout (ADR-0025)', () => {
    expect(deriveType("NOTE-001-api-patterns.md")).toBe("structure");
  });

  it('returns "task" for TASK-NNN files in flat layout', () => {
    expect(deriveType("TASK-001-build-mcp.md")).toBe("task");
  });

  it('returns "decision" for ADR-NNNN files in flat layout', () => {
    expect(deriveType("ADR-0001-use-sqlite.md")).toBe("decision");
  });

  it('ignores invalid frontmatter type', () => {
    expect(deriveType("projectbrief.md", "invalid")).toBe("core");
  });
});

describe("deriveTitle", () => {
  it("extracts H1 heading from content", () => {
    expect(deriveTitle("foo", "# My Title\nSome content")).toBe("My Title");
  });

  it("falls back to ID when no H1 heading", () => {
    expect(deriveTitle("projectbrief", "Some content without heading")).toBe(
      "projectbrief",
    );
  });

  it("trims whitespace from heading", () => {
    expect(deriveTitle("foo", "#   Spaced Title  \n")).toBe("Spaced Title");
  });

  it("uses first H1 only, not H2", () => {
    expect(
      deriveTitle("foo", "## Section\n\n# Real Title\n\n## Another"),
    ).toBe("Real Title");
  });
});

describe("extractMetadata", () => {
  it("extracts bold key-value pairs", () => {
    const content = `**Status:** Accepted\n**Date:** 2026-03-01\n**Deciders:** Developer`;
    const meta = extractMetadata(content);
    expect(meta).toEqual({
      Status: "Accepted",
      Date: "2026-03-01",
      Deciders: "Developer",
    });
  });

  it("handles multi-word keys", () => {
    const content = `**Added:** 2026-03-01\n**Updated:** 2026-03-09`;
    const meta = extractMetadata(content);
    expect(meta.Added).toBe("2026-03-01");
    expect(meta.Updated).toBe("2026-03-09");
  });

  it("returns empty object for no metadata", () => {
    expect(extractMetadata("Just some text\nnothing bold")).toEqual({});
  });

  it("handles metadata inline with other content", () => {
    const content = `# Title\n\n**Status:** In Progress\n\nSome description here.\n\n**Priority:** High`;
    const meta = extractMetadata(content);
    expect(meta.Status).toBe("In Progress");
    expect(meta.Priority).toBe("High");
  });
});

describe("extractSections", () => {
  it("splits by H2 headings", () => {
    const content = `# Title\n\nPreamble text\n\n## Section One\nContent one\n\n## Section Two\nContent two`;
    const sections = extractSections(content);
    expect(sections["_preamble"]).toContain("# Title");
    expect(sections["_preamble"]).toContain("Preamble text");
    expect(sections["Section One"]).toContain("Content one");
    expect(sections["Section Two"]).toContain("Content two");
  });

  it("handles content with no H2 headings", () => {
    const content = "Just plain text\nno sections";
    const sections = extractSections(content);
    expect(sections["_preamble"]).toContain("Just plain text");
    expect(Object.keys(sections)).toHaveLength(1);
  });

  it("handles empty sections", () => {
    const content = "## Empty\n## Next\nContent";
    const sections = extractSections(content);
    expect(sections["Empty"]).toBe("");
    expect(sections["Next"]).toContain("Content");
  });
});

describe("extractCrossRefs", () => {
  it("finds TASK references", () => {
    const refs = extractCrossRefs("References TASK-001 and TASK-042.");
    expect(refs).toContain("TASK-001");
    expect(refs).toContain("TASK-042");
  });

  it("finds ADR references", () => {
    const refs = extractCrossRefs("See ADR-0001 for rationale.");
    expect(refs).toContain("ADR-0001");
  });

  it("deduplicates references", () => {
    const refs = extractCrossRefs("TASK-001 is mentioned. TASK-001 again.");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe("TASK-001");
  });

  it("finds mixed references", () => {
    const refs = extractCrossRefs("TASK-001 implements ADR-0001.");
    expect(refs).toContain("TASK-001");
    expect(refs).toContain("ADR-0001");
  });

  it("returns empty array for no references", () => {
    expect(extractCrossRefs("No references here.")).toEqual([]);
  });
});

describe("parseMarkdownFile", () => {
  it("parses a task file correctly", () => {
    const content = `# TASK-001: Build MCP Server\n\n**Status:** In Progress\n**Added:** 2026-03-01\n**Updated:** 2026-03-09\n\n## Description\nBuild the server. See ADR-0001.`;
    const parsed = parseMarkdownFile("tasks/TASK-001-build-mcp.md", content);

    expect(parsed.id).toBe("TASK-001");
    expect(parsed.type).toBe("task");
    expect(parsed.title).toBe("TASK-001: Build MCP Server");
    expect(parsed.status).toBe("In Progress");
    expect(parsed.createdAt).toBe("2026-03-01");
    expect(parsed.updatedAt).toBe("2026-03-09");
    expect(parsed.crossRefs).toContain("ADR-0001");
  });

  it("parses a decision file correctly", () => {
    const content = `# ADR-0001: Use SQLite\n\n**Status:** Accepted\n**Date:** 2026-03-01\n\n## Decision\nUse SQLite with FTS5.`;
    const parsed = parseMarkdownFile("decisions/ADR-0001-use-sqlite.md", content);

    expect(parsed.id).toBe("ADR-0001");
    expect(parsed.type).toBe("decision");
    expect(parsed.title).toBe("ADR-0001: Use SQLite");
    expect(parsed.status).toBe("Accepted");
    expect(parsed.createdAt).toBe("2026-03-01");
  });

  it("parses a core file correctly", () => {
    const content = `# Project Brief\n\n## Overview\nA test project.`;
    const parsed = parseMarkdownFile("projectbrief.md", content);

    expect(parsed.id).toBe("projectbrief");
    expect(parsed.type).toBe("core");
    expect(parsed.title).toBe("Project Brief");
    expect(parsed.status).toBeNull();
  });

  it("parses YAML frontmatter", () => {
    const content = `---
title: "API Patterns"
type: note
tags:
  - backend
  - api
created: 2026-03-15
updated: 2026-03-20
related:
  - ADR-0001
---

# NOTE-001: API Patterns

Some content about API patterns.`;
    const parsed = parseMarkdownFile("NOTE-001-api-patterns.md", content);

    expect(parsed.id).toBe("NOTE-001-api-patterns");
    expect(parsed.type).toBe("structure");
    expect(parsed.tags).toContain("backend");
    expect(parsed.tags).toContain("api");
    expect(parsed.related).toContain("ADR-0001");
    expect(parsed.createdAt).toBe("2026-03-15");
    expect(parsed.updatedAt).toBe("2026-03-20");
  });

  it("extracts wikilinks from content", () => {
    const content = `# Some Note\n\nSee [[ADR-0001]] and [[TASK-001]] for details.`;
    const parsed = parseMarkdownFile("some-note.md", content);

    expect(parsed.crossRefs).toContain("ADR-0001");
    expect(parsed.crossRefs).toContain("TASK-001");
  });

  it("extracts inline tags from content", () => {
    const content = `# Some Note\n\nThis is about #performance and #caching.`;
    const parsed = parseMarkdownFile("some-note.md", content);

    expect(parsed.tags).toContain("performance");
    expect(parsed.tags).toContain("caching");
  });

  it("deduplicates tags from frontmatter and inline", () => {
    const content = `---
tags:
  - backend
---

# Note

Content about #backend and #frontend.`;
    const parsed = parseMarkdownFile("note.md", content);

    // "backend" should appear only once
    const backendCount = parsed.tags.filter(t => t === "backend").length;
    expect(backendCount).toBe(1);
    expect(parsed.tags).toContain("frontend");
  });

  it("parses status from ## Status: heading format", () => {
    const content = `# ADR-0025: Use Redis\n\n## Status: Accepted\n\n## Context\nNeed caching.`;
    const parsed = parseMarkdownFile("ADR-0025.md", content);

    expect(parsed.status).toBe("Accepted");
  });

  it("prefers YAML frontmatter status over ## Status: heading", () => {
    const content = `---\nstatus: Proposed\n---\n\n# ADR-0026: Something\n\n## Status: Accepted\n\n## Context\nTest.`;
    const parsed = parseMarkdownFile("ADR-0026.md", content);

    expect(parsed.status).toBe("Proposed");
  });

  it("prefers **Status:** over ## Status: heading", () => {
    const content = `# ADR-0027: Something\n\n**Status:** Deprecated\n\n## Status: Accepted\n\n## Context\nTest.`;
    const parsed = parseMarkdownFile("ADR-0027.md", content);

    expect(parsed.status).toBe("Deprecated");
  });

  it("parses v2 task with YAML frontmatter status", () => {
    const content = `---\ntype: task\nstatus: In Progress\ncreated: 2026-03-20\nupdated: 2026-03-27\n---\n\n# TASK-010: Test task\n\n## Request\nDo something.`;
    const parsed = parseMarkdownFile("TASK-010.md", content);

    expect(parsed.id).toBe("TASK-010");
    expect(parsed.type).toBe("task");
    expect(parsed.status).toBe("In Progress");
  });
});

// ── ADR-0025: NOTE type removal ─────────────────────────────────────

describe("ADR-0025: NOTE type removed", () => {
  it("rejects 'note' as frontmatter type — falls back to path-based detection", () => {
    expect(deriveType("some-file.md", "note")).toBe("structure");
  });

  it("NOTE-NNN filenames get no special ID extraction", () => {
    expect(deriveId("NOTE-001.md")).toBe("NOTE-001");
    expect(deriveId("NOTE-042-some-title.md")).toBe("NOTE-042-some-title");
  });

  it("NOTE-NNN files are classified as structure, not note", () => {
    expect(deriveType("NOTE-001.md")).toBe("structure");
    expect(deriveType("NOTE-042-api-patterns.md")).toBe("structure");
  });

  it("parseMarkdownFile with type:note frontmatter produces structure item", () => {
    const content = `---\ntype: note\ntags: [backend]\n---\n\n# NOTE-001: API Patterns\n\nContent.`;
    const parsed = parseMarkdownFile("NOTE-001.md", content);

    expect(parsed.type).toBe("structure");
    expect(parsed.id).toBe("NOTE-001");
  });

  it("ItemType union has exactly 4 values — core, task, decision, structure", () => {
    const validTypes: string[] = ["core", "task", "decision", "structure"];
    for (const t of validTypes) {
      // Valid types are accepted by deriveType
      expect(deriveType("test.md", t)).toBe(t);
    }
    // "note" is rejected
    expect(deriveType("test.md", "note")).toBe("structure");
  });

  it("cross-ref regex does not match NOTE-NNN patterns", () => {
    const refs = extractCrossRefs("See NOTE-001 and TASK-001 and ADR-0001.");
    expect(refs).not.toContain("NOTE-001");
    expect(refs).toContain("TASK-001");
    expect(refs).toContain("ADR-0001");
  });
});

describe("isIndexFile", () => {
  it("identifies _index.md files", () => {
    expect(isIndexFile("tasks/_index.md")).toBe(true);
    expect(isIndexFile("decisions/_index.md")).toBe(true);
    expect(isIndexFile("/full/path/tasks/_index.md")).toBe(true);
  });

  it("rejects non-index files", () => {
    expect(isIndexFile("tasks/TASK-001.md")).toBe(false);
    expect(isIndexFile("projectbrief.md")).toBe(false);
  });
});

// ── extractStatus ────────────────────────────────────────────────────

describe("extractStatus", () => {
  it("returns status from YAML frontmatter data", () => {
    expect(extractStatus("body", { status: "Accepted" })).toBe("Accepted");
  });

  it("returns status from **Status:** bold format", () => {
    expect(extractStatus("**Status:** In Progress\n\nOther content", {})).toBe("In Progress");
  });

  it("returns status from ## Status: heading format", () => {
    expect(extractStatus("# Title\n\n## Status: Proposed\n\n## Context", {})).toBe("Proposed");
  });

  it("prefers YAML over bold over heading", () => {
    expect(extractStatus("**Status:** Bold\n\n## Status: Heading", { status: "YAML" })).toBe("YAML");
  });

  it("prefers bold over heading when no YAML", () => {
    expect(extractStatus("**Status:** Bold\n\n## Status: Heading", {})).toBe("Bold");
  });

  it("returns null when no status found", () => {
    expect(extractStatus("No status here", {})).toBeNull();
  });
});
