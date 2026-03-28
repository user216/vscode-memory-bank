import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  parseAssertions,
  executeAssertion,
  verifyAdr,
  verifyAllDecisions,
  type Assertion,
} from "../src/verify-assertions.js";

// ---------------------------------------------------------------------------
// parseAssertions
// ---------------------------------------------------------------------------

describe("parseAssertions", () => {
  it("extracts FILE_EXISTS assertions from ## Verification section", () => {
    const md = `# ADR-0001\n\n## Verification\n\n<!-- ASSERT_FILE_EXISTS: src/index.ts -->\n`;
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].type).toBe("FILE_EXISTS");
    expect(assertions[0].filePath).toBe("src/index.ts");
  });

  it("extracts FILE_NOT_EXISTS assertions", () => {
    const md = `# ADR\n\n## Verification\n\n<!-- ASSERT_FILE_NOT_EXISTS: legacy/old.ts -->\n`;
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].type).toBe("FILE_NOT_EXISTS");
    expect(assertions[0].filePath).toBe("legacy/old.ts");
  });

  it("extracts CONTAINS assertions with pipe-separated file and string", () => {
    const md = `# ADR\n\n## Verification\n\n<!-- ASSERT_CONTAINS: package.json | minisearch -->\n`;
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].type).toBe("CONTAINS");
    expect(assertions[0].filePath).toBe("package.json");
    expect(assertions[0].searchString).toBe("minisearch");
  });

  it("extracts NOT_CONTAINS assertions", () => {
    const md = `# ADR\n\n## Verification\n\n<!-- ASSERT_NOT_CONTAINS: package.json | better-sqlite3 -->\n`;
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].type).toBe("NOT_CONTAINS");
    expect(assertions[0].filePath).toBe("package.json");
    expect(assertions[0].searchString).toBe("better-sqlite3");
  });

  it("extracts multiple assertions from one section", () => {
    const md = [
      "# ADR",
      "",
      "## Verification",
      "",
      "<!-- ASSERT_FILE_EXISTS: a.ts -->",
      "<!-- ASSERT_FILE_NOT_EXISTS: b.ts -->",
      "<!-- ASSERT_CONTAINS: c.ts | hello -->",
    ].join("\n");
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(3);
    expect(assertions.map((a) => a.type)).toEqual([
      "FILE_EXISTS",
      "FILE_NOT_EXISTS",
      "CONTAINS",
    ]);
  });

  it("returns empty array when no ## Verification section exists", () => {
    const md = `# ADR\n\nSome content\n\n## Decision\n\nWe decided X.\n`;
    expect(parseAssertions(md)).toHaveLength(0);
  });

  it("ignores assertions outside ## Verification section", () => {
    const md = [
      "# ADR",
      "",
      "## Decision",
      "",
      "<!-- ASSERT_FILE_EXISTS: should-be-ignored.ts -->",
      "",
      "## Verification",
      "",
      "<!-- ASSERT_FILE_EXISTS: should-be-found.ts -->",
    ].join("\n");
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].filePath).toBe("should-be-found.ts");
  });

  it("ignores assertions inside fenced code blocks", () => {
    const md = [
      "# ADR",
      "",
      "## Verification",
      "",
      "```markdown",
      "<!-- ASSERT_FILE_EXISTS: inside-code-block.ts -->",
      "```",
      "",
      "<!-- ASSERT_FILE_EXISTS: outside-code-block.ts -->",
    ].join("\n");
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].filePath).toBe("outside-code-block.ts");
  });

  it("stops at the next ## heading after Verification", () => {
    const md = [
      "# ADR",
      "",
      "## Verification",
      "",
      "<!-- ASSERT_FILE_EXISTS: in-verification.ts -->",
      "",
      "## Consequences",
      "",
      "<!-- ASSERT_FILE_EXISTS: in-consequences.ts -->",
    ].join("\n");
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].filePath).toBe("in-verification.ts");
  });

  it("skips malformed CONTAINS without pipe separator", () => {
    const md = `# ADR\n\n## Verification\n\n<!-- ASSERT_CONTAINS: no-pipe-here -->\n<!-- ASSERT_FILE_EXISTS: valid.ts -->\n`;
    const assertions = parseAssertions(md);
    expect(assertions).toHaveLength(1);
    expect(assertions[0].type).toBe("FILE_EXISTS");
  });
});

// ---------------------------------------------------------------------------
// executeAssertion
// ---------------------------------------------------------------------------

describe("executeAssertion", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-assert-"));
    fs.writeFileSync(path.join(tmpDir, "exists.txt"), "hello world");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("FILE_EXISTS passes when file exists", () => {
    const a: Assertion = { type: "FILE_EXISTS", filePath: "exists.txt", raw: "" };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(true);
  });

  it("FILE_EXISTS fails when file missing", () => {
    const a: Assertion = { type: "FILE_EXISTS", filePath: "nope.txt", raw: "" };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("does not exist");
  });

  it("FILE_NOT_EXISTS passes when file missing", () => {
    const a: Assertion = { type: "FILE_NOT_EXISTS", filePath: "nope.txt", raw: "" };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(true);
  });

  it("FILE_NOT_EXISTS fails when file exists", () => {
    const a: Assertion = { type: "FILE_NOT_EXISTS", filePath: "exists.txt", raw: "" };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("should not");
  });

  it("CONTAINS passes when file has search string", () => {
    const a: Assertion = {
      type: "CONTAINS",
      filePath: "exists.txt",
      searchString: "hello",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(true);
  });

  it("CONTAINS fails when file lacks search string", () => {
    const a: Assertion = {
      type: "CONTAINS",
      filePath: "exists.txt",
      searchString: "goodbye",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(false);
  });

  it("CONTAINS fails when file does not exist", () => {
    const a: Assertion = {
      type: "CONTAINS",
      filePath: "missing.txt",
      searchString: "anything",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("not found");
  });

  it("NOT_CONTAINS passes when file lacks search string", () => {
    const a: Assertion = {
      type: "NOT_CONTAINS",
      filePath: "exists.txt",
      searchString: "goodbye",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(true);
  });

  it("NOT_CONTAINS fails when file has search string", () => {
    const a: Assertion = {
      type: "NOT_CONTAINS",
      filePath: "exists.txt",
      searchString: "hello",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(false);
  });

  it("NOT_CONTAINS passes when file does not exist (trivially true)", () => {
    const a: Assertion = {
      type: "NOT_CONTAINS",
      filePath: "missing.txt",
      searchString: "anything",
      raw: "",
    };
    const r = executeAssertion(a, tmpDir);
    expect(r.passed).toBe(true);
    expect(r.detail).toContain("trivially");
  });
});

// ---------------------------------------------------------------------------
// verifyAdr
// ---------------------------------------------------------------------------

describe("verifyAdr", () => {
  let tmpDir: string;
  let mbDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-verifyadr-"));
    mbDir = path.join(tmpDir, "memory-bank");
    fs.mkdirSync(mbDir);

    // Create a test file the assertions reference
    fs.writeFileSync(path.join(tmpDir, "src.ts"), "export const x = 1;");

    // ADR with passing assertions
    fs.writeFileSync(
      path.join(mbDir, "ADR-0001.md"),
      [
        "---",
        "title: Test Decision",
        "status: Accepted",
        "---",
        "# ADR-0001: Test Decision",
        "",
        "## Decision",
        "We use src.ts.",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: src.ts -->",
        "<!-- ASSERT_CONTAINS: src.ts | export const x -->",
        "<!-- ASSERT_FILE_NOT_EXISTS: old.ts -->",
      ].join("\n"),
    );

    // ADR with a failing assertion
    fs.writeFileSync(
      path.join(mbDir, "ADR-0002.md"),
      [
        "---",
        "title: Failing Decision",
        "status: Accepted",
        "---",
        "# ADR-0002: Failing Decision",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: nonexistent.ts -->",
      ].join("\n"),
    );

    // ADR with no verification section
    fs.writeFileSync(
      path.join(mbDir, "ADR-0003.md"),
      [
        "---",
        "title: No Assertions",
        "status: Accepted",
        "---",
        "# ADR-0003: No Assertions",
        "",
        "## Decision",
        "Nothing to verify.",
      ].join("\n"),
    );

    // ADR not accepted — should be skipped by verifyAllDecisions
    fs.writeFileSync(
      path.join(mbDir, "ADR-0004.md"),
      [
        "---",
        "title: Proposed Only",
        "status: Proposed",
        "---",
        "# ADR-0004: Proposed Only",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: nonexistent.ts -->",
      ].join("\n"),
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("verifies a passing ADR", () => {
    const result = verifyAdr(path.join(mbDir, "ADR-0001.md"), tmpDir);
    expect(result.adrId).toBe("ADR-0001");
    expect(result.title).toBe("Test Decision");
    expect(result.status).toBe("Accepted");
    expect(result.assertions).toHaveLength(3);
    expect(result.allPassed).toBe(true);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  it("verifies a failing ADR", () => {
    const result = verifyAdr(path.join(mbDir, "ADR-0002.md"), tmpDir);
    expect(result.allPassed).toBe(false);
    expect(result.results[0].passed).toBe(false);
  });

  it("returns empty assertions for ADR without ## Verification", () => {
    const result = verifyAdr(path.join(mbDir, "ADR-0003.md"), tmpDir);
    expect(result.assertions).toHaveLength(0);
    expect(result.allPassed).toBe(true);
  });

  it("extracts title from frontmatter", () => {
    const result = verifyAdr(path.join(mbDir, "ADR-0001.md"), tmpDir);
    expect(result.title).toBe("Test Decision");
  });

  it("extracts status from **Status:** bold format", () => {
    const boldStatusAdr = path.join(mbDir, "ADR-0020.md");
    fs.writeFileSync(
      boldStatusAdr,
      [
        "# ADR-0020: Bold Status",
        "",
        "**Status:** Accepted",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: src.ts -->",
      ].join("\n"),
    );

    const result = verifyAdr(boldStatusAdr, tmpDir);
    expect(result.status).toBe("Accepted");
  });

  it("extracts status from ## Status: heading format", () => {
    const headingStatusAdr = path.join(mbDir, "ADR-0022.md");
    fs.writeFileSync(
      headingStatusAdr,
      [
        "# ADR-0022: Heading Status",
        "",
        "## Status: Deprecated",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: src.ts -->",
      ].join("\n"),
    );

    const result = verifyAdr(headingStatusAdr, tmpDir);
    expect(result.status).toBe("Deprecated");
  });
});

// ---------------------------------------------------------------------------
// verifyAllDecisions
// ---------------------------------------------------------------------------

describe("verifyAllDecisions", () => {
  let tmpDir: string;
  let mbDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-verifyall-"));
    mbDir = path.join(tmpDir, "memory-bank");
    fs.mkdirSync(mbDir);

    fs.writeFileSync(path.join(tmpDir, "real-file.ts"), "content");

    fs.writeFileSync(
      path.join(mbDir, "ADR-0001.md"),
      [
        "---",
        "title: Accepted With Assert",
        "status: Accepted",
        "---",
        "# ADR-0001",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: real-file.ts -->",
      ].join("\n"),
    );

    // Accepted but no assertions — should be excluded
    fs.writeFileSync(
      path.join(mbDir, "ADR-0002.md"),
      [
        "---",
        "title: Accepted No Assert",
        "status: Accepted",
        "---",
        "# ADR-0002",
        "",
        "## Decision",
        "No verification.",
      ].join("\n"),
    );

    // Proposed — should be excluded
    fs.writeFileSync(
      path.join(mbDir, "ADR-0003.md"),
      [
        "---",
        "title: Proposed",
        "status: Proposed",
        "---",
        "# ADR-0003",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: real-file.ts -->",
      ].join("\n"),
    );

    // Non-ADR file — should be ignored
    fs.writeFileSync(path.join(mbDir, "TASK-001.md"), "# Not an ADR");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("only includes accepted ADRs with assertions", () => {
    const results = verifyAllDecisions(mbDir, tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].adrId).toBe("ADR-0001");
  });

  it("skips non-ADR files", () => {
    const results = verifyAllDecisions(mbDir, tmpDir);
    const ids = results.map((r) => r.adrId);
    expect(ids).not.toContain("TASK-001");
  });

  it("skips proposed ADRs", () => {
    const results = verifyAllDecisions(mbDir, tmpDir);
    const ids = results.map((r) => r.adrId);
    expect(ids).not.toContain("ADR-0003");
  });

  it("returns empty array when no ADRs match", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "mbvmb-empty-"));
    const results = verifyAllDecisions(emptyDir, tmpDir);
    expect(results).toHaveLength(0);
    fs.rmSync(emptyDir, { recursive: true });
  });

  it("includes ADRs with **Status:** Accepted (no YAML frontmatter)", () => {
    fs.writeFileSync(
      path.join(mbDir, "ADR-0010.md"),
      [
        "# ADR-0010: Bold Status Test",
        "",
        "**Status:** Accepted",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: real-file.ts -->",
      ].join("\n"),
    );

    const results = verifyAllDecisions(mbDir, tmpDir);
    const ids = results.map((r) => r.adrId);
    expect(ids).toContain("ADR-0010");
  });

  it("includes ADRs with ## Status: Accepted heading", () => {
    fs.writeFileSync(
      path.join(mbDir, "ADR-0011.md"),
      [
        "# ADR-0011: Heading Status Test",
        "",
        "## Status: Accepted",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: real-file.ts -->",
      ].join("\n"),
    );

    const results = verifyAllDecisions(mbDir, tmpDir);
    const ids = results.map((r) => r.adrId);
    expect(ids).toContain("ADR-0011");
  });

  it("skips ADRs with **Status:** Proposed (non-Accepted inline)", () => {
    fs.writeFileSync(
      path.join(mbDir, "ADR-0012.md"),
      [
        "# ADR-0012: Bold Proposed",
        "",
        "**Status:** Proposed",
        "",
        "## Verification",
        "",
        "<!-- ASSERT_FILE_EXISTS: real-file.ts -->",
      ].join("\n"),
    );

    const results = verifyAllDecisions(mbDir, tmpDir);
    const ids = results.map((r) => r.adrId);
    expect(ids).not.toContain("ADR-0012");
  });
});
