export type ItemType = "core" | "task" | "decision" | "note" | "structure";

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
  tags: string[];
  related: string[];
  createdAt: string | null;
  updatedAt: string | null;
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
