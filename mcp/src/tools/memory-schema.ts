import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStore } from "../index-store.js";

export function registerMemorySchema(server: McpServer): void {
  server.tool(
    "memory_schema",
    "Returns the memory bank data model: item types, status values, link relation types, and available tools. Call this first to discover what queries are possible and understand the data structure. No parameters required.",
    {},
    async () => {
      const store = getStore();

      // Count items by type
      const typeCounts: Record<string, number> = {};
      for (const item of store.items.values()) {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      }

      // Get distinct statuses
      const statusSet = new Set<string>();
      for (const item of store.items.values()) {
        if (item.status) statusSet.add(item.status);
      }

      // Get distinct relation types with counts
      const relationCounts: Record<string, number> = {};
      for (const links of store.outgoing.values()) {
        for (const link of links) {
          relationCounts[link.relation] = (relationCounts[link.relation] || 0) + 1;
        }
      }

      const schema = {
        itemTypes: {
          core: "Project overview file (projectbrief.md). Legacy v1 context files are classified as 'note' if present.",
          task: "Task files with status lifecycle: Pending → In Progress → Completed / Abandoned",
          decision: "ADR files with status lifecycle: Proposed → Accepted → Deprecated / Superseded / Rejected",
          note: "General-purpose notes with YAML frontmatter and tags",
        },
        currentCounts: typeCounts,
        statusValues: Array.from(statusSet).sort(),
        linkRelations: Object.keys(relationCounts).length > 0
          ? Object.fromEntries(
              Object.entries(relationCounts).sort(([, a], [, b]) => b - a),
            )
          : { references: "(auto-detected)", implements: "(manual)", supersedes: "(manual)", blocks: "(manual)", "depends-on": "(manual)" },
        tools: {
          memory_search: "Full-text search with MiniSearch (supports AND, OR, NOT, prefix*)",
          memory_query: "Structured query by type, status, date range",
          memory_recall: "Token-budgeted context retrieval with priority strategies",
          memory_link: "Create typed relationships between items",
          memory_unlink: "Delete a relationship between two items",
          memory_update_link: "Update the relation type of an existing link",
          memory_graph: "Traverse knowledge graph from a starting item",
          memory_schema: "This tool — describes the data model",
          memory_create_task: "Create a new task with auto-generated ID, proper formatting, and index update",
          memory_create_decision: "Create a new ADR decision with auto-generated ID, proper formatting, and index update",
          memory_create_note: "Create a new note with auto-generated ID, YAML frontmatter, and tags",
          memory_import_decisions: "Import ADR files from an external directory or re-sync existing decisions",
          memory_update_status: "Update task/decision status with validation and optional log entry",
          memory_update_decision: "Update content of an existing ADR (title, context, decision, alternatives, consequences)",
          memory_save_context: "[DEPRECATED] Formerly saved activeContext.md. Now appends progress log to most recent in-progress task. Use memory_update_status with log_entry instead.",
          memory_status: "Computed project status: task/decision counts by status, tag cloud",
          memory_tags: "List all tags with item counts, or list items with a specific tag",
          memory_bulk_update_status: "Update status of multiple tasks/decisions in a single call with partial success reporting",
          memory_add_tag: "Add a tag to an item's YAML frontmatter (creates frontmatter if missing)",
          memory_migrate_v1: "Detect and migrate v1 layout (tasks/decisions subdirs) to flat v2 layout (dry_run by default)",
          memory_verify_decisions: "Run compliance assertions from ADR ## Verification sections against the codebase",
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
