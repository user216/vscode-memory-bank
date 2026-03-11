# vscode-memory-bank MCP Server — Tester Guide

Setup and testing guide for adding the memory-bank MCP server to VS Code with GitHub Copilot and Claude Agent SDK.

## Prerequisites

Before you start, make sure you have:

- [ ] VS Code (latest stable)
- [ ] GitHub Copilot extension installed and active
- [ ] Claude model selected as your Copilot model (Settings > GitHub Copilot > select Claude)
- [ ] Node.js 20+ installed (`node --version` to check)
- [ ] Git installed

## Step 1: Clone the Repository

Open a terminal and clone the vscode-memory-bank repository:

```bash
git clone https://github.com/user216/vscode-memory-bank.git
```

Note the full path where you cloned it. You will need it later. Example:

```
/home/yourname/vscode-memory-bank
```

## Step 2: Build the MCP Server

```bash
cd vscode-memory-bank/mcp
```

```bash
npm install
```

Wait for all dependencies to install (this downloads SQLite bindings and the MCP SDK).

```bash
npx tsc
```

This compiles TypeScript to JavaScript. If successful, you will see no output — that means no errors.

Verify the build produced the entry point:

```bash
ls build/index.js
```

You should see the file listed.

## Step 3: Run Automated Tests (Optional but Recommended)

```bash
npm test
```

Expected output: **65 tests passing** across 3 test files. If any test fails, the build may have an issue — do not proceed until tests pass.

## Step 4: Set Up Your Test Project

Open VS Code in whatever project you want to test with. This can be any existing project or a new empty folder.

### 4a. Initialize Memory Bank (if none exists)

If your project does not have a `memory-bank/` folder yet, create one with the core files. The simplest way: copy the instruction file and let the AI do it.

```bash
mkdir -p .github/instructions
cp /path/to/vscode-memory-bank/instructions/memory-bank.instructions.md .github/instructions/
```

Then open Copilot Chat in VS Code (`Ctrl+Alt+I` or `Cmd+Ctrl+I` on macOS), make sure Claude model is selected, and type:

```
initialize memory bank for this project
```

The AI will create the `memory-bank/` folder with all core files: `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md`, plus `tasks/` and `decisions/` folders.

### 4b. If Memory Bank Already Exists

If the project already has a `memory-bank/` folder — skip to Step 5.

## Step 5: Add MCP Server Configuration

In your test project, create the file `.vscode/mcp.json`:

**Option A: Via Command Palette (recommended)**

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type `MCP: Add Server`
3. Select `Workspace` as the target
4. Choose `stdio` as the transport type
5. Enter server name: `memory-bank`
6. Enter command: `node`
7. For args, you will need to edit the file manually (see below)

**Option B: Create the file manually**

Create `.vscode/mcp.json` in your test project with this content:

```json
{
  "servers": {
    "memory-bank": {
      "command": "node",
      "args": [
        "/FULL/PATH/TO/vscode-memory-bank/mcp/build/index.js"
      ],
      "env": {
        "MEMORY_BANK_PATH": "${workspaceFolder}/memory-bank"
      }
    }
  }
}
```

**IMPORTANT:** Replace `/FULL/PATH/TO/vscode-memory-bank` with the actual absolute path where you cloned the repository in Step 1.

Examples:
- Linux: `/home/yourname/vscode-memory-bank/mcp/build/index.js`
- macOS: `/Users/yourname/vscode-memory-bank/mcp/build/index.js`
- Windows: `C:\\Users\\yourname\\vscode-memory-bank\\mcp\\build\\index.js`

## Step 6: Start the MCP Server

After saving `mcp.json`, VS Code will show a code lens (inline button) above the server entry in the file. Click **Start** to launch the server.

Alternatively:
1. Press `Ctrl+Shift+P`
2. Type `MCP: List Servers`
3. Select `memory-bank`
4. Choose **Start**

VS Code may show a **trust prompt** the first time: "Do you trust this MCP server?" Click **Allow**.

### How to verify it started

1. Press `Ctrl+Shift+P` > `MCP: List Servers` > `memory-bank` > **Show Output**
2. You should see in the output panel:
   ```
   vscode-memory-bank-mcp starting...
   Memory bank path: /path/to/your/project/memory-bank
   Database initialized at /path/to/your/project/memory-bank/.mcp/memory-bank.db
   Synced N files from /path/to/your/project/memory-bank
   Initial sync complete: N files
   Watching for changes in /path/to/your/project/memory-bank
   MCP server running on stdio
   ```
3. The number `N` should match how many `.md` files are in your `memory-bank/` folder (excluding `_index.md` files).

### How to verify tools are available

1. Open Copilot Chat (`Ctrl+Alt+I`)
2. Click the **Configure Tools** button (wrench/gear icon) in the chat input area
3. You should see tools listed under **memory-bank** including:
   - `memory_search`
   - `memory_query`
   - `memory_recall`
   - `memory_link`
   - `memory_unlink`
   - `memory_update_link`
   - `memory_graph`
   - `memory_schema`
4. Make sure all are **enabled** (toggled ON)

## Step 7: Test the Tools

Open Copilot Chat, make sure Claude is the selected model, and try these test prompts one at a time:

### Test 1: Schema Discovery
```
Use the memory_schema tool to show me what's in the memory bank
```
**Expected:** JSON response listing item types (core, task, decision), item counts, status values, link relations, and available tools.

### Test 2: Full-Text Search
```
Use memory_search to find everything about "architecture" in the memory bank
```
**Expected:** List of matching items with highlighted excerpts where the word "architecture" appears.

### Test 3: Structured Query
```
Use memory_query to list all core files in the memory bank
```
**Expected:** List of 6 core files (projectbrief, productContext, systemPatterns, techContext, activeContext, progress) with their titles.

### Test 4: Token-Budgeted Recall
```
Use memory_recall with the "active" priority strategy and a budget of 2000 tokens to get current project context
```
**Expected:** Condensed summary starting with activeContext, then progress, then in-progress tasks — all fitting within ~2000 tokens.

### Test 5: Knowledge Graph
```
Use memory_graph to show all items connected to "activeContext" with depth 2
```
**Expected:** Graph visualization showing activeContext and items it references (ADRs, tasks) and their connections.

### Test 6: Create a Link
```
Use memory_link to create an "implements" relationship from TASK-001 to ADR-0001
```
**Expected:** Confirmation message showing the link was created. (Adjust TASK/ADR IDs to match what exists in your memory bank. Use `memory_query` first to see available IDs.)

### Test 7: Search with Filters
```
Use memory_search to find "progress" but only in task files
```
**Expected:** Only results from task files (type "task"), not from core files like progress.md.

### Test 8: Query by Status
```
Use memory_query to show all decisions with status "Accepted"
```
**Expected:** List of ADR files with status "Accepted".

### Test 9: Recall Strategies Comparison
Try each of the 3 strategies and compare:

```
Use memory_recall with "foundational" strategy, budget 3000
```

```
Use memory_recall with "recent" strategy, budget 3000
```

```
Use memory_recall with "active" strategy, budget 3000
```

**Expected:** Different ordering of content. Foundational starts with projectbrief, recent sorts by last update, active starts with activeContext + in-progress tasks.

### Test 10: Natural Language (No Explicit Tool Mention)
```
What tasks are currently in progress in this project?
```
**Expected:** The AI should automatically decide to use `memory_query` or `memory_search` to answer. This tests whether tools are naturally discoverable by Claude.

## Step 8: Test File Watcher (Live Sync)

1. Open any file in `memory-bank/` (e.g., `activeContext.md`)
2. Make a small edit and save
3. Immediately ask Copilot Chat:
   ```
   Use memory_search to find the text I just added
   ```
4. **Expected:** The new content should appear in search results — the file watcher re-synced it to SQLite automatically.

## Multiple VS Code Windows (Multi-Instance)

**This works fine.** Each VS Code window spawns its own MCP server process. Here is why there are no conflicts:

| Scenario | What Happens | Status |
|----------|-------------|--------|
| 3 VS Code windows, 3 different projects | 3 separate server processes, 3 separate SQLite databases, no shared state | Works perfectly |
| 2 VS Code windows, same project | 2 server processes sharing the same SQLite file. WAL mode (Write-Ahead Logging) handles concurrent reads. Writes are serialized by SQLite | Works fine for normal use |

**Technical details:**

- **Stdio transport** means each VS Code window spawns its own `node` child process. No shared TCP port, no port conflicts.
- **`${workspaceFolder}/memory-bank`** resolves to different paths for different projects, so each server has its own database file (`memory-bank/.mcp/memory-bank.db`).
- **SQLite WAL mode** (enabled in the server code) allows multiple simultaneous readers and one writer. Since the MCP server is overwhelmingly read-heavy (only `memory_link`, `memory_unlink`, and `memory_update_link` write to links), contention is negligible.
- **The file watcher** (`fs.watch`) is also per-process and per-directory — no cross-window interference.

**The one edge case that could theoretically cause a brief hiccup:** If two windows have the same project open and both AI sessions try to create links at the exact same millisecond, SQLite may return `SQLITE_BUSY` for one of them, which surfaces as a tool error. The retry would succeed. In practice this has near-zero probability.

## Troubleshooting

### Server won't start

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Cannot find module" error | Wrong path in `mcp.json` | Check the `args` path is absolute and points to `build/index.js` |
| "command not found: node" | Node.js not in PATH | Install Node.js 20+ or use full path like `/usr/bin/node` |
| No output, server immediately exits | Missing `memory-bank/` directory | Create memory-bank folder first (Step 4a) |
| Trust prompt blocks startup | VS Code security | Click "Allow" on the trust dialog |

### Tools not appearing in Copilot Chat

1. Check server is running: `Ctrl+Shift+P` > `MCP: List Servers` > should show `memory-bank` as running
2. Check Configure Tools button in chat — make sure tools are toggled ON
3. Restart server: `MCP: List Servers` > `memory-bank` > **Restart**
4. Reload VS Code window: `Ctrl+Shift+P` > `Developer: Reload Window`

### Tools appear but return errors

1. Check server output: `MCP: List Servers` > `memory-bank` > **Show Output**
2. Common errors:
   - "Database not initialized" — server did not start properly, restart it
   - "no such table: items_fts" — corrupt database, delete `memory-bank/.mcp/` folder and restart server
   - Empty search results — verify memory-bank files exist and contain text

### Performance

The server syncs all markdown files into SQLite on startup. For a typical memory bank (5-20 files), startup is under 100ms. For very large memory banks (100+ files), startup may take a few seconds.

## What to Report

When reporting test results, please include:

1. **OS and VS Code version** (`code --version`)
2. **Node.js version** (`node --version`)
3. **Copilot extension version** (Extensions panel > GitHub Copilot > version number)
4. **Claude model used** (which Claude model was selected in Copilot settings)
5. **Number of files in memory-bank/** (`ls memory-bank/ | wc -l`)
6. **MCP server output** (from Show Output — copy the first 10 lines)
7. **For each test**: pass/fail, and if failed — the exact prompt used, the response received, and what was expected
8. **Multi-instance test**: did you test with multiple VS Code windows? any issues?

## Quick Reference

| Action | How |
|--------|-----|
| Start server | `Ctrl+Shift+P` > `MCP: List Servers` > `memory-bank` > Start |
| Stop server | `Ctrl+Shift+P` > `MCP: List Servers` > `memory-bank` > Stop |
| Restart server | `Ctrl+Shift+P` > `MCP: List Servers` > `memory-bank` > Restart |
| View server logs | `Ctrl+Shift+P` > `MCP: List Servers` > `memory-bank` > Show Output |
| Check available tools | Chat input > Configure Tools button (wrench icon) |
| Open chat | `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Ctrl+I` (macOS) |
| Edit MCP config | Open `.vscode/mcp.json` in editor |
