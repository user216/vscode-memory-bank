export declare const TASK_STATUSES: readonly ["Pending", "In Progress", "Completed", "Abandoned"];
export declare const DECISION_STATUSES: readonly ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];
/** Common aliases → canonical status values */
export declare const STATUS_ALIASES: Record<string, string>;
/** Resolve a status string using aliases. */
export declare function resolveStatus(rawStatus: string): string;
export declare function getMemoryBankPath(): string;
export declare function slugify(title: string): string;
/**
 * Get the next available ID by scanning both the root dir (v2 flat layout)
 * and the legacy subdir (v1: tasks/ or decisions/) for ID continuity.
 */
export declare function getNextId(dir: string, prefix: string, padding: number): string;
export declare function updateDecisionIndex(_dir: string): void;
export declare function updateTaskIndex(_dir: string): void;
