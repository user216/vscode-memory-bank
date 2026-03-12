---
name: building-vscode-agent-plugins
description: |
  Guide for creating VS Code Copilot Agent Plugins. Use when building plugin.json manifests,
  packaging skills/agents/hooks/MCP servers into distributable plugins, bundling MCP servers
  with auto-install, configuring plugin marketplaces, or submitting to github/awesome-copilot.
  Covers plugin structure, manifest schema, distribution models, MCP integration, and cross-platform
  installation methods.
argument-hint: describe what kind of plugin you want to build
user-invocable: true
---

# VS Code Copilot Agent Plugins Skill

Create, package, and distribute Copilot Agent Plugins — prepackaged bundles of chat customizations
(skills, agents, hooks, MCP servers) installable via the VS Code Extensions sidebar.

> **Feature status**: Preview (March 2026). Requires `chat.plugins.enabled: true` in VS Code settings.

## What Is an Agent Plugin

An agent plugin is a **Git repo** containing a `plugin.json` manifest that bundles related chat
customizations. Unlike VS Code extensions (`.vsix`), plugins:

- Distribute via **Git repos** (not the VS Code Marketplace)
- Auto-update when the source repo changes
- Install through `@agentPlugins` search in the Extensions sidebar
- Don't require TypeScript/JavaScript compilation
- Can include MCP servers, skills, agents, hooks, and prompts

## Quick Start

Create a `plugin.json` at the repo root:

```json
{
  "name": "my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0",
  "keywords": ["category", "tools"],
  "author": { "name": "Your Name" },
  "repository": "https://github.com/owner/repo",
  "license": "MIT",
  "agents": ["./agents/my-agent.agent.md"],
  "skills": ["./skills/my-skill"]
}
```

## Plugin Directory Structure

```
my-plugin/
  plugin.json                    # Required: manifest
  README.md                      # Recommended: documentation
  CHANGELOG.md                   # Recommended: version history
  LICENSE                        # Recommended: license file
  .mcp.json                      # Optional: MCP server config
  agents/
    planner.agent.md             # Agent definitions
    worker.agent.md
  skills/
    my-skill/
      SKILL.md                   # Skill definition
      templates/                 # Supporting files
        template.md
  hooks/
    hooks.json                   # Hook event definitions
    scripts/
      session-start.sh           # Hook scripts
      session-stop.sh
  instructions/
    global.instructions.md       # Global instructions
  prompts/
    init.prompt.md               # Prompt files
  mcp-server-build/              # Optional: bundled MCP server
    index.js
    package.json
    package-lock.json
  start-mcp.sh                   # Optional: MCP launcher with auto-install
```

## plugin.json Manifest Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique plugin ID, lowercase with hyphens (e.g., `my-plugin`) |
| `description` | string | What this plugin does (shown in browse UI) |

### Recommended Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Semantic version (e.g., `1.0.0`) |
| `keywords` | string[] | Discovery tags (max 10, lowercase with hyphens) |
| `author` | object | `{ "name": "...", "url": "..." }` |
| `repository` | string | GitHub repo URL |
| `license` | string | SPDX license ID (e.g., `MIT`, `Apache-2.0`) |

### Content Arrays

| Field | Type | Description |
|-------|------|-------------|
| `agents` | string[] | Paths to `.agent.md` files |
| `skills` | string[] | Paths to skill directories (containing `SKILL.md`) |
| `commands` | string[] | Paths to command/prompt `.md` files |

> **Note**: Per awesome-copilot guidelines, `instructions` are standalone resources
> and are **not** included in `plugin.json` arrays. They are discovered by convention
> from the `instructions/` directory.

### Complete Example

```json
{
  "name": "memory-bank",
  "description": "Persistent AI project memory across sessions",
  "version": "0.3.0",
  "keywords": ["memory", "context", "mcp", "ai-memory", "knowledge-graph"],
  "author": {
    "name": "user216",
    "url": "https://github.com/user216"
  },
  "repository": "https://github.com/user216/memory-bank-plugin",
  "license": "Apache-2.0",
  "agents": [
    "./agents/memory-planner.agent.md",
    "./agents/memory-worker.agent.md"
  ],
  "skills": [
    "./skills/managing-memory-bank"
  ]
}
```

## MCP Server Integration

### Option 1: npx from npm (public)

Publish your MCP server to npm, reference it via `npx`:

```json
// .mcp.json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server@latest"],
      "env": {
        "MY_PATH": "${workspaceFolder}/data"
      }
    }
  }
}
```

**Pros**: Always latest version, no files in plugin repo.
**Cons**: Requires npm account, package is public.

### Option 2: Bundled with auto-install (private-friendly)

Bundle the compiled MCP server JS in the plugin repo. Use a launcher script
that auto-installs native dependencies on first run:

**Directory layout:**
```
mcp-server-build/
  index.js              # Compiled MCP server entry point
  package.json           # Dependencies (for npm install)
  package-lock.json      # Lockfile for reproducible installs
start-mcp.sh             # Launcher with auto-install
```

**start-mcp.sh:**
```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$SCRIPT_DIR/mcp-server-build"

if [ ! -d "$MCP_DIR/node_modules/better-sqlite3" ]; then
  cd "$MCP_DIR" && npm install --production --silent 2>/dev/null
fi

exec node "$MCP_DIR/index.js" "$@"
```

**.mcp.json:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "bash",
      "args": ["./start-mcp.sh"],
      "env": {
        "MY_PATH": "${workspaceFolder}/data"
      }
    }
  }
}
```

**Pros**: No npm publish, works with private repos, native deps handled per-platform.
**Cons**: Compiled JS committed to repo, slightly larger clone.

### Option 3: npx from GitHub (private repos)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "github:owner/repo#subdirectory"],
      "env": {}
    }
  }
}
```

**Pros**: No npm publish, private repos work with SSH.
**Cons**: Clones entire repo on each npx invocation, slower startup.

## Distribution Models

### 1. Local Path (Development / Private Use)

Register the plugin directory in VS Code settings:

```json
// settings.json
"chat.plugins.paths": {
  "/path/to/my-plugin": true
}
```

- No remote repo needed
- Changes take effect immediately
- Good for development and private use

### 2. Git Repo as Marketplace Source

Add your repo as a marketplace source:

```json
// settings.json
"chat.plugins.marketplaces": [
  "owner/my-plugin"
]
```

Supported formats:
| Format | Example |
|--------|---------|
| GitHub shorthand | `owner/repo` |
| HTTPS URL | `https://github.com/owner/repo.git` |
| SSH URL | `git@github.com:owner/repo.git` |
| Local path | `/path/to/plugin` |

### 3. awesome-copilot Marketplace

Submit to `github/awesome-copilot` for broad discovery:

#### In-repo plugin (content hosted in awesome-copilot)

```
plugins/my-plugin/
  .github/plugin/plugin.json
  README.md
```

Create via: `npm run plugin:create -- --name my-plugin`
Validate: `npm run plugin:validate`

#### External plugin (content hosted in your repo)

Add entry to `plugins/external.json`:

```json
{
  "name": "my-plugin",
  "description": "What it does",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "repository": "https://github.com/owner/repo",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo"
  }
}
```

### 4. copilot-plugins (Official Microsoft)

The `github/copilot-plugins` repo hosts official/Microsoft plugins.
Community contributions are accepted via PR but subject to strict review.

## Hooks Integration

### hooks.json Format

```json
{
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": "./hooks/scripts/session-start.sh",
      "timeout": 10
    }],
    "Stop": [{
      "type": "command",
      "command": "./hooks/scripts/session-stop.sh",
      "timeout": 10
    }],
    "PreCompact": [{
      "type": "command",
      "command": "./hooks/scripts/pre-compact.sh",
      "timeout": 10
    }]
  }
}
```

### Supported Hook Events

| Event | Trigger |
|-------|---------|
| `SessionStart` | Agent session begins |
| `Stop` | Agent session ends |
| `PreCompact` | Before context window compaction |
| `PreToolUse` | Before a tool is called |
| `PostToolUse` | After a tool returns |

### Hook Script Output

Hook scripts return JSON to stdout:

```json
{
  "additionalContext": "Text injected into agent context",
  "systemMessage": "System-level instruction",
  "decision": "allow"
}
```

Use `"decision": "block"` to prevent an action (e.g., block session exit if context not saved).

## Building a Plugin: Step by Step

### 1. Plan your plugin scope

Answer these questions:
- What problem does this solve for Copilot users?
- Which components do you need? (agents, skills, hooks, MCP server)
- Will users need external services or is everything self-contained?

### 2. Create the directory structure

```bash
mkdir -p my-plugin/{agents,skills/my-skill/templates,hooks/scripts}
```

### 3. Write the components

- **Agents**: Create `.agent.md` files with YAML frontmatter (see `building-vscode-agents` skill)
- **Skills**: Create `SKILL.md` with skill instructions and supporting files
- **Hooks**: Create `hooks.json` and executable scripts
- **MCP**: Bundle compiled server or use npx reference

### 4. Write plugin.json

Reference all components with relative paths. Validate paths exist.

### 5. Add documentation

- `README.md` — Installation, usage, what's included
- `CHANGELOG.md` — Version history
- `LICENSE` — License file

### 6. Test locally

```json
"chat.plugins.paths": {
  "/path/to/my-plugin": true
}
```

Reload VS Code, check `@agentPlugins` in Extensions sidebar.

### 7. Distribute

Push to GitHub and share the repo URL, or add to a marketplace.

## Best Practices

### Design
- **Single theme**: Each plugin should address one workflow or domain
- **Pair agents**: Use planner/worker handoff pairs for complex workflows
- **MCP-first**: Prefer MCP tools over direct file access for structured data

### Naming
- Plugin name: `lowercase-with-hyphens` (e.g., `cloud-development`)
- Agent files: `descriptive-name.agent.md`
- Skill directories: `verb-noun` pattern (e.g., `managing-deployments`)

### Distribution
- Pin versions in `plugin.json` when publishing
- Add `CHANGELOG.md` for every release
- Keep `README.md` current with install instructions
- Use `.gitignore` to exclude `node_modules/` from MCP server builds

### Cross-Platform
- Use `bash` for hook scripts (works on macOS, Linux, WSL)
- For Windows-native support, add `"windows"` variants in hooks.json
- MCP server launchers should handle both Unix and Windows paths

## Related Resources

- [Agent Plugins Docs](https://code.visualstudio.com/docs/copilot/customization/agent-plugins)
- [awesome-copilot Repository](https://github.com/github/awesome-copilot)
- [copilot-plugins Repository](https://github.com/github/copilot-plugins)
- [MCP Servers Docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [building-vscode-agents Skill](../building-vscode-agents/SKILL.md)
- [building-mcp-servers Skill](../building-mcp-servers/SKILL.md)
