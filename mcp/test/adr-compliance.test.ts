import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { verifyAllDecisions } from "../src/verify-assertions.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const MB_PATH = path.resolve(PROJECT_ROOT, "memory-bank");

describe("ADR Compliance", () => {
  it("all accepted ADR assertions pass", () => {
    const results = verifyAllDecisions(MB_PATH, PROJECT_ROOT);

    // Sanity: we should have at least a few ADRs with assertions
    expect(results.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const r of results) {
      for (const ar of r.results) {
        if (!ar.passed) {
          failures.push(`${r.adrId}: ${ar.detail}`);
        }
      }
    }

    expect(failures, `ADR compliance failures:\n${failures.join("\n")}`).toHaveLength(0);
  });

  it("ADR-0021 self-referential assertions pass", () => {
    const results = verifyAllDecisions(MB_PATH, PROJECT_ROOT);
    const adr21 = results.find((r) => r.adrId === "ADR-0021");
    expect(adr21, "ADR-0021 should have assertions").toBeDefined();
    expect(adr21!.allPassed, "ADR-0021 assertions should all pass").toBe(true);
  });
});
