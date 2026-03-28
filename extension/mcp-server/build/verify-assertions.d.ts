/**
 * ADR compliance verification engine.
 *
 * Parses `## Verification` sections from ADR markdown files for machine-readable
 * assertions (HTML comments), then executes them against the project filesystem.
 *
 * Self-contained: works without the MCP store so it can be used by vitest and
 * bash hooks alike.
 */
export type AssertionType = "FILE_EXISTS" | "FILE_NOT_EXISTS" | "CONTAINS" | "NOT_CONTAINS";
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
/**
 * Extract machine-readable assertions from markdown content.
 * Only looks in the `## Verification` section, and skips fenced code blocks.
 */
export declare function parseAssertions(markdown: string): Assertion[];
/**
 * Execute a single assertion against the filesystem.
 */
export declare function executeAssertion(assertion: Assertion, projectRoot: string): AssertionResult;
/**
 * Verify a single ADR file. Reads the file, parses frontmatter for metadata,
 * extracts assertions, and executes them.
 */
export declare function verifyAdr(adrFilePath: string, projectRoot: string): AdrVerificationResult;
/**
 * Verify all accepted ADRs in a memory-bank directory.
 * Only ADRs with `status: Accepted` and at least one assertion are included.
 */
export declare function verifyAllDecisions(mbPath: string, projectRoot: string): AdrVerificationResult[];
