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
} from "../src/parser.js";

describe("deriveId", () => {
  it("extracts task ID from filename", () => {
    expect(deriveId("tasks/TASK-001-build-mcp-server.md")).toBe("TASK-001");
  });

  it("extracts ADR ID from filename", () => {
    expect(deriveId("decisions/ADR-0001-use-sqlite.md")).toBe("ADR-0001");
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

  it('returns "core" for root-level files', () => {
    expect(deriveType("projectbrief.md")).toBe("core");
    expect(deriveType("activeContext.md")).toBe("core");
    expect(deriveType("progress.md")).toBe("core");
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
