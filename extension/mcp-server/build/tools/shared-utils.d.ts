export declare const TASK_STATUSES: readonly ["Pending", "In Progress", "Completed", "Abandoned"];
export declare const DECISION_STATUSES: readonly ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];
export declare function getMemoryBankPath(): string;
export declare function slugify(title: string): string;
export declare function getNextId(dir: string, prefix: string, padding: number): string;
export declare function updateDecisionIndex(decisionsDir: string): void;
export declare function updateTaskIndex(tasksDir: string): void;
