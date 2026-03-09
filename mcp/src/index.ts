#!/usr/bin/env node

import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initDb, closeDb } from "./db.js";
import { syncAllFiles, watchMemoryBank } from "./sync.js";
import { registerMemorySearch } from "./tools/memory-search.js";
import { registerMemoryQuery } from "./tools/memory-query.js";
import { registerMemoryRecall } from "./tools/memory-recall.js";
import { registerMemoryLink } from "./tools/memory-link.js";
import { registerMemoryGraph } from "./tools/memory-graph.js";
import { registerMemorySchema } from "./tools/memory-schema.js";

const MEMORY_BANK_PATH = process.env.MEMORY_BANK_PATH || path.join(process.cwd(), "memory-bank");

async function main(): Promise<void> {
  console.error("vscode-memory-bank-mcp starting...");
  console.error(`Memory bank path: ${MEMORY_BANK_PATH}`);

  // Initialize database
  initDb(MEMORY_BANK_PATH);

  // Sync markdown files to SQLite
  const synced = syncAllFiles(MEMORY_BANK_PATH);
  console.error(`Initial sync complete: ${synced} files`);

  // Watch for file changes
  const watcher = watchMemoryBank(MEMORY_BANK_PATH);

  // Create MCP server
  const server = new McpServer({
    name: "vscode-memory-bank",
    version: "1.0.0",
  });

  // Register all tools
  registerMemorySearch(server);
  registerMemoryQuery(server);
  registerMemoryRecall(server);
  registerMemoryLink(server);
  registerMemoryGraph(server);
  registerMemorySchema(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP server running on stdio");

  // Cleanup on exit
  process.on("SIGINT", () => {
    console.error("Shutting down...");
    watcher.close();
    closeDb();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.error("Shutting down...");
    watcher.close();
    closeDb();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  closeDb();
  process.exit(1);
});
