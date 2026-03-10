import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../db.js";

interface CountRow {
  type: string;
  cnt: number;
}

interface RelationRow {
  relation: string;
  cnt: number;
}

export function registerMemorySchema(server: McpServer): void {
  server.tool(
    "memory_schema",
    "Returns the memory bank data model: item types, status values, link relation types, and available tools. Use for discovering what queries are possible.",
    {},
    async () => {
      const db = getDb();

      // Count items by type
      const typeCounts = db
        .prepare("SELECT type, COUNT(*) as cnt FROM items GROUP BY type")
        .all() as CountRow[];

      // Get distinct statuses
      const statuses = db
        .prepare("SELECT DISTINCT status FROM items WHERE status IS NOT NULL ORDER BY status")
        .all() as Array<{ status: string }>;

      // Get distinct relation types
      const relations = db
        .prepare("SELECT relation, COUNT(*) as cnt FROM links GROUP BY relation ORDER BY cnt DESC")
        .all() as RelationRow[];

      const schema = {
        itemTypes: {
          core: "Narrative context files (projectbrief, productContext, systemPatterns, techContext, activeContext, progress)",
          task: "Task files with status lifecycle: Pending → In Progress → Completed / Abandoned",
          decision: "ADR files with status lifecycle: Proposed → Accepted → Deprecated / Superseded",
        },
        currentCounts: Object.fromEntries(typeCounts.map((r) => [r.type, r.cnt])),
        statusValues: statuses.map((r) => r.status),
        linkRelations: relations.length > 0
          ? Object.fromEntries(relations.map((r) => [r.relation, r.cnt]))
          : { references: "(auto-detected)", implements: "(manual)", supersedes: "(manual)", blocks: "(manual)", "depends-on": "(manual)" },
        tools: {
          memory_search: "Full-text search with FTS5 (supports AND, OR, NOT, prefix*)",
          memory_query: "Structured query by type, status, date range",
          memory_recall: "Token-budgeted context retrieval with priority strategies",
          memory_link: "Create typed relationships between items",
          memory_graph: "Traverse knowledge graph from a starting item",
          memory_schema: "This tool — describes the data model",
          memory_create_task: "Create a new task with auto-generated ID, proper formatting, and index update",
          memory_create_decision: "Create a new ADR decision with auto-generated ID, proper formatting, and index update",
          memory_import_decisions: "Import ADR files from an external directory or re-sync existing decisions to SQLite",
          memory_update_status: "Update task/decision status with validation and optional log entry",
          memory_save_context: "Save activeContext.md with structured sections (focus, changes, decisions, next steps)",
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    },
  );
}
