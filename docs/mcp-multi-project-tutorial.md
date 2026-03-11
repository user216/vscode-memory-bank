# CodeGraphContext MCP — Multi-Project Tutorial

## Overview

CodeGraphContext (CGC) parses your code into a **graph database** (functions, classes, calls, imports, inheritance) and exposes it to AI assistants via the **MCP protocol**. This tutorial covers setup, usage, and per-project isolation.

---

## 1. Installation

```bash
# Create a venv
python3 -m venv .venv
source .venv/bin/activate

# Install CGC with all extras
pip install -e "/path/to/CodeGraphContext[scip,dev]"
pip install kuzu  # KuzuDB backend (recommended)
```

Or install from the fork directly:

```bash
pip install "codegraphcontext[scip] @ git+https://github.com/andriispivakelectrodosg/CodeGraphContext.git"
pip install kuzu
```

---

## 2. Database Backend

CGC supports multiple backends. **KuzuDB** is recommended (embedded, zero-config, cross-platform).

| Backend | Platform | Setup | Notes |
|---------|----------|-------|-------|
| **KuzuDB** | All (Win/Mac/Linux) | `pip install kuzu` | Recommended, embedded |
| FalkorDB Lite | Unix only, Python 3.12+ | Included | Code default (see note) |
| FalkorDB Remote | All | External server | For shared/remote graphs |
| Neo4j | All | Docker or native | For large-scale use |

> **Note:** The code defaults to FalkorDB Lite, not KuzuDB. Set `DEFAULT_DATABASE=kuzudb` explicitly (see below).

---

## 3. Quick Start — Single Project

```bash
cd /path/to/my-project

# Index the project
cgc index .

# Check what's indexed
cgc list

# Start the MCP server (for AI assistant integration)
cgc mcp start
```

---

## 4. MCP Configuration for Your IDE

### Option A — Setup Wizard (auto-detects IDE)

```bash
cgc mcp setup
```

Supports: VS Code, Cursor, Windsurf, Claude Code, Gemini CLI, ChatGPT Codex, Cline, RooCode, Amazon Q, JetBrains AI, Aider, Kiro, Antigravity.

### Option B — Manual `.mcp.json`

Place in your project root:

```json
{
  "mcpServers": {
    "CodeGraphContext": {
      "command": "/path/to/.venv/bin/cgc",
      "args": ["mcp", "start"],
      "env": {
        "DEFAULT_DATABASE": "kuzudb"
      }
    }
  }
}
```

---

## 5. Multi-Project Usage (Shared Database)

By default, all projects share one database at `~/.codegraphcontext/kuzudb`. Index multiple projects into it:

```bash
cgc index /path/to/project-A
cgc index /path/to/project-B
cgc list  # shows both projects
```

AI assistants filter by `repo_path` parameter on each MCP tool call. This is the simplest setup but provides no isolation between projects.

---

## 6. Multi-Project Usage (Full Isolation)

For **complete isolation** — each project gets its own separate graph database.

### How It Works

Each MCP server launch is a separate OS process. By setting a different `KUZUDB_PATH` per project, each gets its own database:

```
Project A (.mcp.json)                    Project B (.mcp.json)
    │                                        │
    ▼                                        ▼
cgc mcp start                            cgc mcp start
(separate process)                       (separate process)
    │                                        │
    ▼                                        ▼
project-a/.codegraphcontext/kuzudb/      project-b/.codegraphcontext/kuzudb/
(isolated DB)                            (isolated DB)
```

### Step-by-Step Setup

#### 1. Create `.mcp.json` in your project root

**Project A** — `/path/to/project-a/.mcp.json`:

```json
{
  "mcpServers": {
    "CodeGraphContext": {
      "command": "/path/to/.venv/bin/cgc",
      "args": ["mcp", "start"],
      "env": {
        "DEFAULT_DATABASE": "kuzudb",
        "KUZUDB_PATH": ".codegraphcontext/kuzudb"
      }
    }
  }
}
```

**Project B** — `/path/to/project-b/.mcp.json`:

```json
{
  "mcpServers": {
    "CodeGraphContext": {
      "command": "/path/to/.venv/bin/cgc",
      "args": ["mcp", "start"],
      "env": {
        "DEFAULT_DATABASE": "kuzudb",
        "KUZUDB_PATH": ".codegraphcontext/kuzudb"
      }
    }
  }
}
```

Each project stores its database under its own `.codegraphcontext/` directory.

#### 2. Add `.codegraphcontext/` to `.gitignore`

```bash
echo ".codegraphcontext/" >> .gitignore
```

#### 3. Index with the isolated database

```bash
cd /path/to/project-a
KUZUDB_PATH=.codegraphcontext/kuzudb cgc index .
```

#### 4. Optionally add a `.cgcignore`

Place in the project root to skip irrelevant files (gitignore syntax):

```
node_modules/
.venv/
dist/
build/
__pycache__/
*.min.js
.codegraphcontext/
```

#### 5. Open the project in your IDE

The MCP server auto-starts with the isolated database when the IDE reads `.mcp.json`.

---

## 7. Configuration Reference

### Config File Locations (Priority Order)

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | `.mcp.json` `env` block | Per-project MCP server |
| 2 | `.env` in project directory | Per-project CLI + MCP |
| 3 (lowest) | `~/.codegraphcontext/.env` | Global defaults |

### Key Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_DATABASE` | `falkordb` | Backend: `kuzudb`, `falkordb`, `falkordb-remote`, `neo4j` |
| `KUZUDB_PATH` | `~/.codegraphcontext/kuzudb` | KuzuDB storage directory |
| `FALKORDB_PATH` | `~/.codegraphcontext/falkordb.db` | FalkorDB data file |
| `SCIP_INDEXER` | `false` | Enable SCIP-based indexing |
| `SCIP_INDEX_PATH` | (auto) | Path to SCIP index file |
| `INDEX_VARIABLES` | `true` | Index variable nodes |
| `MAX_FILE_SIZE_MB` | `10` | Max file size to index |
| `IGNORE_TEST_FILES` | `false` | Skip test files |
| `IGNORE_HIDDEN_FILES` | `true` | Skip hidden files |
| `PARALLEL_WORKERS` | `4` | Parallel indexing threads |
| `CACHE_ENABLED` | `true` | Cache for faster re-indexing |
| `IGNORE_DIRS` | `node_modules,venv,...` | Directories to skip |

### CLI Config Commands

```bash
cgc config show              # View all settings
cgc config set KEY VALUE     # Set a value
cgc config reset             # Reset to defaults
```

> **Note:** `KUZUDB_PATH` is not in the config manager's known keys. Use environment variables or `.env` files to set it.

---

## 8. CLI Analysis Commands

```bash
# Find callers of a function
cgc analyze callers my_function

# Find callees of a function
cgc analyze callees my_function

# Find dead code (unused functions)
cgc analyze dead-code

# Class hierarchy
cgc analyze tree MyClass

# Cyclomatic complexity
cgc analyze complexity my_function

# Call chain between two functions
cgc analyze calls function_a function_b

# Raw Cypher query
cgc query "MATCH (f:Function) RETURN f.name, f.cyclomatic_complexity ORDER BY f.cyclomatic_complexity DESC LIMIT 10"

# Force re-index
cgc index /path/to/project --force

# Index with SCIP (higher accuracy for TS, Go, Java)
cgc index /path/to/project --scip

# Watch for live changes
cgc watch /path/to/project

# Delete a project from the graph
cgc delete /path/to/project
```

---

## 9. MCP Tools Available to AI Assistants

### Indexing & Management

| Tool | Description |
|------|-------------|
| `add_code_to_graph` | Index a directory/file (returns job ID) |
| `add_package_to_graph` | Index a package by name |
| `list_indexed_repositories` | List all indexed repos |
| `delete_repository` | Remove a repo from the graph |
| `check_job_status` | Check background job progress |
| `list_jobs` | List all background jobs |
| `get_repository_stats` | File, function, class, module counts |

### Code Search

| Tool | Description |
|------|-------------|
| `find_code` | Search by keyword (supports fuzzy search) |

### Analysis & Quality

| Tool | Description |
|------|-------------|
| `analyze_code_relationships` | Callers, callees, class hierarchy, dead code, imports, decorators, etc. |
| `find_dead_code` | Find unused functions |
| `calculate_cyclomatic_complexity` | Complexity of a specific function |
| `find_most_complex_functions` | Top N most complex functions |

### Monitoring

| Tool | Description |
|------|-------------|
| `watch_directory` | Index + continuously monitor for changes |
| `list_watched_paths` | List watched directories |
| `unwatch_directory` | Stop watching |

### Bundles & Advanced

| Tool | Description |
|------|-------------|
| `load_bundle` | Load a `.cgc` bundle (local or registry) |
| `search_registry_bundles` | Search the bundle registry |
| `execute_cypher_query` | Run raw read-only Cypher queries |
| `visualize_graph_query` | Generate a Neo4j Browser URL |

### Graph Schema for Cypher Queries

**Node types:** `Repository`, `File`, `Module`, `Class`, `Function`

**Relationships:** `CONTAINS`, `CALLS`, `IMPORTS`, `INHERITS`, `INSTANTIATES`, `USES`, `DECORATES`

**Node properties:** `name`, `path`, `line`, `scope`, `kind`, `cyclomatic_complexity`, `source`, `parameters`, `return_type`

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| Server defaults to FalkorDB Lite | Set `DEFAULT_DATABASE=kuzudb` in `.mcp.json` env block |
| `kuzu is not installed` error | Run `pip install kuzu` in the CGC venv |
| `KUZUDB_PATH` not accepted by `cgc config set` | Use env var or `.env` file instead |
| Stale index after code changes | Run `cgc index /path --force` or use `watch_directory` |
| Large repo slow to index | Increase `PARALLEL_WORKERS`, add `.cgcignore`, set `IGNORE_TEST_FILES=true` |
