import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "node:path";
import { getMemoryBankPath } from "./shared-utils.js";
import { verifyAdr, verifyAllDecisions } from "../verify-assertions.js";
import type { AdrVerificationResult } from "../verify-assertions.js";

export function registerMemoryVerifyDecisions(server: McpServer): void {
  server.tool(
    "memory_verify_decisions",
    "Run compliance assertions embedded in accepted ADR decisions. Checks that the codebase matches what the ADRs prescribe. Each ADR can have a ## Verification section with ASSERT_FILE_EXISTS, ASSERT_FILE_NOT_EXISTS, ASSERT_CONTAINS, ASSERT_NOT_CONTAINS assertions as HTML comments.",
    {
      adr_id: z
        .string()
        .optional()
        .describe(
          "ADR ID to verify (e.g. 'ADR-0015'). Omit to verify all accepted ADRs with assertions.",
        ),
    },
    async ({ adr_id }) => {
      const mbPath = getMemoryBankPath();
      const projectRoot = path.resolve(mbPath, "..");

      let results: AdrVerificationResult[];

      if (adr_id) {
        const filePath = path.join(mbPath, `${adr_id}.md`);
        try {
          const result = verifyAdr(filePath, projectRoot);
          results = [result];
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Could not read ${adr_id}.md. Make sure the ADR ID is correct (e.g. 'ADR-0015').`,
              },
            ],
          };
        }
      } else {
        results = verifyAllDecisions(mbPath, projectRoot);
      }

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No accepted ADRs with ## Verification assertions found.",
            },
          ],
        };
      }

      // Build summary
      const totalAssertions = results.reduce(
        (sum, r) => sum + r.assertions.length,
        0,
      );
      const totalPassed = results.reduce(
        (sum, r) => sum + r.results.filter((ar) => ar.passed).length,
        0,
      );
      const totalFailed = totalAssertions - totalPassed;
      const allPassed = totalFailed === 0;

      const lines: string[] = [];
      lines.push(
        `# ADR Compliance Report\n`,
        `**${totalPassed}/${totalAssertions} assertions passed** across ${results.length} ADR(s)${allPassed ? " ✓" : ` — ${totalFailed} FAILED`}\n`,
      );

      for (const r of results) {
        const status = r.allPassed ? "PASS" : "FAIL";
        lines.push(`## ${r.adrId}: ${r.title} [${status}]\n`);
        for (const ar of r.results) {
          const icon = ar.passed ? "  ✓" : "  ✗";
          lines.push(`${icon} ${ar.detail}`);
        }
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );
}
