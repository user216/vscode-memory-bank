# Product Context

## Why This Project Exists
AI coding assistants in VS Code (GitHub Copilot with Claude) lose all working context between sessions and during automatic context compaction. The original memory-bank instruction from github/awesome-copilot solves the basic problem with structured markdown files, but lacks:
- Automatic context capture (relies on agent discipline)
- Structured search across memories
- Token-aware context injection
- Dedicated agent personas for plan vs act workflows
- Integration with VS Code's full customization surface (hooks, skills, agents, prompts)

## Target User
Developer who uses VS Code with GitHub Copilot extension and Claude as the AI model, working on projects where context continuity across sessions matters.

## How It Should Work
1. **Zero-config start**: Copy the instruction file, start coding. The agent manages memory bank files.
2. **Progressive enhancement**: Install more layers for more automation and capabilities.
3. **Invisible when working**: Hooks and skills handle context capture/injection automatically.
4. **Visible when needed**: Slash commands (/memory-update, /memory-review) for explicit interaction.
5. **Human-readable always**: All state stored as markdown files in the repository.

## UX Principles
- Additive-only changes to the original instruction — no breaking changes
- Each layer works independently if layers above are not installed
- Memory bank files are git-trackable and human-editable
- The agent should remember context without the user having to repeat themselves
