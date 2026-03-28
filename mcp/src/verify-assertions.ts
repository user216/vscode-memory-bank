/**
 * ADR compliance verification engine.
 *
 * Parses `## Verification` sections from ADR markdown files for machine-readable
 * assertions (HTML comments), then executes them against the project filesystem.
 *
 * Self-contained: works without the MCP store so it can be used by vitest and
 * bash hooks alike.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { extractStatus } from "./parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssertionType =
  | "FILE_EXISTS"
  | "FILE_NOT_EXISTS"
  | "CONTAINS"
  | "NOT_CONTAINS";

export interface Assertion {
  type: AssertionType;
  /** Relative path (from project root) for file checks, or target file for content checks */
  filePath: string;
  /** Search string for CONTAINS / NOT_CONTAINS */
  searchString?: string;
  /** Original HTML comment text */
  raw: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  detail: string;
}

export interface AdrVerificationResult {
  adrId: string;
  title: string;
  status: string;
  assertions: Assertion[];
  results: AssertionResult[];
  allPassed: boolean;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const ASSERT_RE =
  /<!--\s*ASSERT_(FILE_EXISTS|FILE_NOT_EXISTS|CONTAINS|NOT_CONTAINS):\s*(.+?)\s*-->/g;

/**
 * Extract machine-readable assertions from markdown content.
 * Only looks in the `## Verification` section, and skips fenced code blocks.
 */
export function parseAssertions(markdown: string): Assertion[] {
  // Find the ## Verification section
  const verificationSection = extractVerificationSection(markdown);
  if (!verificationSection) return [];

  const assertions: Assertion[] = [];
  let m: RegExpExecArray | null;
  // Reset lastIndex in case the regex was used before
  ASSERT_RE.lastIndex = 0;
  while ((m = ASSERT_RE.exec(verificationSection)) !== null) {
    const kind = m[1] as AssertionType;
    const payload = m[2].trim();
    const raw = m[0];

    if (kind === "CONTAINS" || kind === "NOT_CONTAINS") {
      const pipeIdx = payload.indexOf("|");
      if (pipeIdx === -1) continue; // malformed — skip
      assertions.push({
        type: kind,
        filePath: payload.slice(0, pipeIdx).trim(),
        searchString: payload.slice(pipeIdx + 1).trim(),
        raw,
      });
    } else {
      assertions.push({ type: kind, filePath: payload, raw });
    }
  }
  return assertions;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Execute a single assertion against the filesystem.
 */
export function executeAssertion(
  assertion: Assertion,
  projectRoot: string,
): AssertionResult {
  const absPath = path.resolve(projectRoot, assertion.filePath);

  switch (assertion.type) {
    case "FILE_EXISTS": {
      const exists = fs.existsSync(absPath);
      return {
        assertion,
        passed: exists,
        detail: exists
          ? `OK: ${assertion.filePath} exists`
          : `FAIL: ${assertion.filePath} does not exist`,
      };
    }
    case "FILE_NOT_EXISTS": {
      const exists = fs.existsSync(absPath);
      return {
        assertion,
        passed: !exists,
        detail: !exists
          ? `OK: ${assertion.filePath} does not exist`
          : `FAIL: ${assertion.filePath} exists (should not)`,
      };
    }
    case "CONTAINS": {
      if (!fs.existsSync(absPath)) {
        return {
          assertion,
          passed: false,
          detail: `FAIL: ${assertion.filePath} not found (cannot check for "${assertion.searchString}")`,
        };
      }
      const content = fs.readFileSync(absPath, "utf-8");
      const found = content.includes(assertion.searchString!);
      return {
        assertion,
        passed: found,
        detail: found
          ? `OK: ${assertion.filePath} contains "${assertion.searchString}"`
          : `FAIL: ${assertion.filePath} does not contain "${assertion.searchString}"`,
      };
    }
    case "NOT_CONTAINS": {
      if (!fs.existsSync(absPath)) {
        // File doesn't exist → it trivially does not contain the string
        return {
          assertion,
          passed: true,
          detail: `OK: ${assertion.filePath} does not exist (trivially passes NOT_CONTAINS)`,
        };
      }
      const content = fs.readFileSync(absPath, "utf-8");
      const found = content.includes(assertion.searchString!);
      return {
        assertion,
        passed: !found,
        detail: !found
          ? `OK: ${assertion.filePath} does not contain "${assertion.searchString}"`
          : `FAIL: ${assertion.filePath} contains "${assertion.searchString}" (should not)`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// High-level verification
// ---------------------------------------------------------------------------

/**
 * Verify a single ADR file. Reads the file, parses frontmatter for metadata,
 * extracts assertions, and executes them.
 */
export function verifyAdr(
  adrFilePath: string,
  projectRoot: string,
): AdrVerificationResult {
  const raw = fs.readFileSync(adrFilePath, "utf-8");
  const { data, content: bodyContent } = matter(raw);

  const basename = path.basename(adrFilePath, ".md");
  const title =
    (typeof data.title === "string" ? data.title : "") ||
    extractFirstHeading(raw) ||
    basename;
  const status = extractStatus(bodyContent, data) || "Unknown";

  const assertions = parseAssertions(raw);
  const results = assertions.map((a) => executeAssertion(a, projectRoot));
  const allPassed = results.every((r) => r.passed);

  return { adrId: basename, title, status, assertions, results, allPassed };
}

/**
 * Verify all accepted ADRs in a memory-bank directory.
 * Only ADRs with `status: Accepted` and at least one assertion are included.
 */
export function verifyAllDecisions(
  mbPath: string,
  projectRoot: string,
): AdrVerificationResult[] {
  const files = fs
    .readdirSync(mbPath)
    .filter((f) => /^ADR-\d{4}\.md$/.test(f))
    .sort();

  const results: AdrVerificationResult[] = [];
  for (const file of files) {
    const filePath = path.join(mbPath, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content: bodyContent } = matter(raw);
    const status = extractStatus(bodyContent, data) || "";
    if (status !== "Accepted") continue;

    const assertions = parseAssertions(raw);
    if (assertions.length === 0) continue;

    results.push(verifyAdr(filePath, projectRoot));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFirstHeading(markdown: string): string | undefined {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : undefined;
}

/**
 * Extract the `## Verification` section from markdown, excluding fenced code blocks.
 * Returns the raw text of the section, or undefined if not found.
 */
function extractVerificationSection(markdown: string): string | undefined {
  // Strip fenced code blocks first to avoid false matches
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");

  // Find "## Verification" heading
  const start = stripped.search(/^## Verification\s*$/m);
  if (start === -1) return undefined;

  // Find the next ## heading (or end of string)
  const afterHeading = start + "## Verification".length;
  const nextSection = stripped.slice(afterHeading).search(/^## /m);
  if (nextSection === -1) {
    return stripped.slice(afterHeading);
  }
  return stripped.slice(afterHeading, afterHeading + nextSection);
}
