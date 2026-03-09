# Layer 4: Hooks

**Status:** Built
**VS Code Primitive:** Hooks (`.json` config + shell scripts)
**Dependencies:** Layers 0-1
**Directory:** `hooks/`

## What It Does

Layer 4 adds automatic lifecycle automation to the memory bank. Instead of relying on the agent to voluntarily follow instructions (Layer 0) or the user to invoke commands (Layer 2), hooks execute shell scripts at key moments in the agent session lifecycle.

Hooks are **deterministic** — they run your code, not the AI's interpretation of instructions. This makes them the most reliable layer for critical operations like context preservation.

## What It Adds Over Layers 0-3

| Feature | Layers 0-3 | Layer 4 |
|---------|------------|---------|
| Context injection at session start | Agent must remember to read files | Hook automatically injects activeContext |
| Context preservation before compaction | Agent usually forgets | Hook automatically saves snapshot |
| Session end summary | Agent may or may not update files | Hook blocks stop until files are updated |
| Reliability | Depends on agent following instructions | Deterministic shell script execution |
| User effort | Must remind agent or use slash commands | Fully automatic |

## Hooks

### SessionStart
**Script:** `hooks/scripts/session-start.sh`
**Fires:** When the user submits the first prompt in a new session

**What it does:**
1. Checks if `memory-bank/` folder exists in the workspace
2. If not found, returns a hint to initialize one
3. If found, reads `activeContext.md`, `progress.md`, and `tasks/_index.md`
4. Returns the content as `additionalContext` — injected into the agent's conversation

**Why this matters:**
Without this hook, every session starts cold. The agent needs to figure out it should read the memory bank (from the instruction), then read each file. With this hook, the agent starts with active context already in its conversation — zero cold-start latency.

**Output format:**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "## Active Context\n...\n## Progress\n...\n## Tasks\n..."
  }
}
```

### PreCompact
**Script:** `hooks/scripts/pre-compact.sh`
**Fires:** Before conversation context is compacted (context window full)

**What it does:**
1. Checks if memory bank exists
2. Appends a timestamped compaction marker to `activeContext.md`
3. Returns a `systemMessage` telling the agent to re-read activeContext after compaction

**Why this matters:**
Context compaction is the single biggest cause of memory loss. The agent's conversation gets truncated, and everything it learned in the session can vanish. This hook ensures the latest state is written to disk _before_ compaction happens, so the agent can recover by re-reading the file.

**Output format:**
```json
{
  "systemMessage": "Memory Bank: activeContext.md has been preserved before compaction. After compaction, re-read memory-bank/activeContext.md to restore context."
}
```

### Stop
**Script:** `hooks/scripts/session-stop.sh`
**Fires:** When the agent session is about to end

**What it does:**
1. Checks the `stop_hook_active` flag to prevent infinite loops
2. Checks if `activeContext.md` was modified in the last 5 minutes
3. If not recently updated, **blocks the stop** with a reason asking the agent to update memory bank files first
4. If recently updated, allows the stop to proceed

**Why this matters:**
The agent often ends a session without persisting what it learned. This hook acts as a safety net — if the memory bank hasn't been updated, the agent is told to update it before it can finish. This ensures every session's work is captured.

**Output format (when blocking):**
```json
{
  "hookSpecificOutput": {
    "decision": "block",
    "reason": "Memory Bank: activeContext.md has not been updated this session. Please update memory-bank/activeContext.md and memory-bank/progress.md with the current session state before ending."
  }
}
```

**Infinite loop prevention:** The `stop_hook_active` flag is `true` when the agent is already continuing from a previous stop block. The script checks this and allows the stop on the second attempt to prevent the agent from being trapped in an infinite update cycle.

## Installation

### Copy hook config to .github/hooks/
```bash
mkdir -p .github/hooks
cp vscode-memory-bank/hooks/memory-hooks.json .github/hooks/
```

### Copy hook scripts
```bash
mkdir -p .github/hooks/scripts
cp vscode-memory-bank/hooks/scripts/*.sh .github/hooks/scripts/
chmod +x .github/hooks/scripts/*.sh
```

### Update script paths in memory-hooks.json
The `command` paths in the JSON file must be relative to the workspace root. If you copy to `.github/hooks/`, update the paths:

```json
{
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": "./.github/hooks/scripts/session-start.sh",
      "timeout": 10
    }]
  }
}
```

## Configuration Options

### Hook file locations (VS Code setting)
```json
{
  "chat.hookFilesLocations": [
    ".github/hooks",
    ".claude"
  ]
}
```

### Per-hook timeout
Each hook has a `timeout` property (in seconds). Default is 30s. The memory bank hooks use 10s since they perform simple file reads.

### OS-specific commands
Each hook supports platform overrides:
```json
{
  "command": "./scripts/session-start.sh",
  "linux": "./scripts/session-start.sh",
  "osx": "./scripts/session-start.sh",
  "windows": "powershell -File ./scripts/session-start.ps1"
}
```

## Dependencies

The hook scripts require:
- `bash` (Linux/macOS) or `powershell` (Windows)
- `jq` — for JSON parsing/generation (`sudo apt install jq` / `brew install jq`)
- `stat` — for file modification time checks (available on all Unix systems)

## All 8 VS Code Hook Events

The memory bank uses 3 of the 8 available events. The others could be used for future enhancements:

| Event | Used? | Potential Use |
|-------|-------|---------------|
| `SessionStart` | **Yes** | Inject active context |
| `UserPromptSubmit` | No | Could capture user intent patterns |
| `PreToolUse` | No | Could inject relevant memories before file edits |
| `PostToolUse` | No | Could capture file changes as observations |
| `PreCompact` | **Yes** | Preserve context before compaction |
| `SubagentStart` | No | Could inject context into subagents |
| `SubagentStop` | No | Could capture subagent findings |
| `Stop` | **Yes** | Ensure context is saved before ending |

## Cross-Format Compatibility

The hook configuration format (`.json` files in `.github/hooks/`) is shared between VS Code Copilot and Claude Code CLI. If you also use Claude Code CLI, be aware of these differences:
- VS Code uses camelCase tool input names (`filePath`); Claude Code uses snake_case (`file_path`)
- VS Code ignores `matcher` fields; Claude Code uses them to filter by tool name
- VS Code auto-converts `preToolUse` to `PreToolUse`; both PascalCase formats work

This toolkit targets VS Code + GitHub Copilot + Claude Agent SDK as the primary platform. The hooks are designed and tested for this environment.

## What This Layer Does NOT Provide
- Structured search across memories (→ Layer 5)
- Token budgeting (→ Layer 5)
- Knowledge graph queries (→ Layer 5)
- Visual UI (→ Layer 6)
- Editor event integration (file save, git branch change) (→ Layer 6)
