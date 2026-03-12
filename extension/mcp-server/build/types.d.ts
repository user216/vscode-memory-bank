export type ItemType = "core" | "task" | "decision";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Abandoned";
export type DecisionStatus = "Proposed" | "Accepted" | "Deprecated" | "Superseded" | "Rejected";
export interface ParsedItem {
    id: string;
    type: ItemType;
    title: string;
    status: string | null;
    filePath: string;
    content: string;
    metadata: Record<string, string>;
    sections: Record<string, string>;
    crossRefs: string[];
    createdAt: string | null;
    updatedAt: string | null;
}
export interface DbItem {
    id: string;
    type: ItemType;
    title: string;
    status: string | null;
    file_path: string;
    content: string;
    metadata: string;
    created_at: string | null;
    updated_at: string | null;
    synced_at: string;
}
export interface DbLink {
    id: number;
    source_id: string;
    target_id: string;
    relation: string;
    created_at: string;
}
export interface SearchResult {
    id: string;
    title: string;
    type: ItemType;
    excerpt: string;
}
export interface QueryResult {
    id: string;
    title: string;
    type: ItemType;
    status: string | null;
    updated_at: string | null;
}
export interface GraphNode {
    id: string;
    title: string;
    type: ItemType;
}
export interface GraphEdge {
    source: string;
    target: string;
    relation: string;
}
