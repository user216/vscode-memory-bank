import { getDb } from "../db.js";
export function registerMemorySchema(server) {
    server.tool("memory_schema", "Returns the memory bank data model: item types, status values, link relation types, and available tools. Call this first to discover what queries are possible and understand the data structure. No parameters required.", {}, async () => {
        const db = getDb();
        // Count items by type
        const typeCounts = db
            .prepare("SELECT type, COUNT(*) as cnt FROM items GROUP BY type")
            .all();
        // Get distinct statuses
        const statuses = db
            .prepare("SELECT DISTINCT status FROM items WHERE status IS NOT NULL ORDER BY status")
            .all();
        // Get distinct relation types
        const relations = db
            .prepare("SELECT relation, COUNT(*) as cnt FROM links GROUP BY relation ORDER BY cnt DESC")
            .all();
        const schema = {
            itemTypes: {
                core: "Narrative context files (projectbrief, productContext, systemPatterns, techContext, activeContext, progress)",
                task: "Task files with status lifecycle: Pending → In Progress → Completed / Abandoned",
                decision: "ADR files with status lifecycle: Proposed → Accepted → Deprecated / Superseded / Rejected",
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
                memory_unlink: "Delete a relationship between two items",
                memory_update_link: "Update the relation type of an existing link",
                memory_graph: "Traverse knowledge graph from a starting item",
                memory_schema: "This tool — describes the data model",
                memory_create_task: "Create a new task with auto-generated ID, proper formatting, and index update",
                memory_create_decision: "Create a new ADR decision with auto-generated ID, proper formatting, and index update",
                memory_import_decisions: "Import ADR files from an external directory or re-sync existing decisions to SQLite",
                memory_update_status: "Update task/decision status with validation and optional log entry",
                memory_update_decision: "Update content of an existing ADR (title, context, decision, alternatives, consequences)",
                memory_save_context: "Save activeContext.md with structured sections (focus, changes, decisions, next steps)",
            },
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(schema, null, 2),
                },
            ],
        };
    });
}
//# sourceMappingURL=memory-schema.js.map