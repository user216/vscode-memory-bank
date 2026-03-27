import * as fs from "node:fs";
import * as path from "node:path";
export const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Abandoned"];
export const DECISION_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];
/** Common aliases → canonical status values */
export const STATUS_ALIASES = {
    "Open": "Pending",
    "open": "Pending",
    "Todo": "Pending",
    "todo": "Pending",
    "Done": "Completed",
    "done": "Completed",
    "Draft": "Proposed",
    "draft": "Proposed",
    "Approved": "Accepted",
    "approved": "Accepted",
};
/** Resolve a status string using aliases. */
export function resolveStatus(rawStatus) {
    return STATUS_ALIASES[rawStatus] || rawStatus;
}
export function getMemoryBankPath() {
    return (process.env.MEMORY_BANK_PATH ||
        path.join(process.cwd(), "memory-bank"));
}
export function slugify(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
}
/**
 * Get the next available ID by scanning both the root dir (v2 flat layout)
 * and the legacy subdir (v1: tasks/ or decisions/) for ID continuity.
 */
export function getNextId(dir, prefix, padding) {
    const filterRegex = new RegExp(`^${prefix}\\d{${padding}}`);
    const idRegex = new RegExp(`^${prefix}(\\d{${padding}})`);
    // Scan the given directory
    const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => filterRegex.test(f))
        : [];
    // Also scan legacy subdir for ID continuity
    const legacySubdir = prefix === "TASK-"
        ? path.join(dir, "tasks")
        : prefix === "ADR-"
            ? path.join(dir, "decisions")
            : null;
    if (legacySubdir && fs.existsSync(legacySubdir)) {
        const legacyFiles = fs.readdirSync(legacySubdir).filter((f) => filterRegex.test(f));
        files.push(...legacyFiles);
    }
    let maxNum = 0;
    for (const f of files) {
        const m = f.match(idRegex);
        if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum)
                maxNum = n;
        }
    }
    return `${prefix}${String(maxNum + 1).padStart(padding, "0")}`;
}
// v1 index update functions — kept as no-ops for backward compatibility
// v2 flat layout does not use _index.md files
export function updateDecisionIndex(_dir) { }
export function updateTaskIndex(_dir) { }
//# sourceMappingURL=shared-utils.js.map