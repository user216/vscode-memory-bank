# ADR-0004: No Model Version Pinning in Agent Files

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
Agent `.agent.md` files accept a `model` field that pins a specific AI model version (e.g., `model: 'Claude Opus 4.6'`). VS Code does not support variable substitution in `.agent.md` frontmatter — the model field is static text. This means any hardcoded version becomes stale when new models release.

We previously hardcoded `Claude Opus 4`, then `Claude Opus 4.6`, and each time had to update all agent files and documentation.

## Decision
Remove the `model` field from all agent files. Agents inherit whatever model the user has configured as their default in VS Code Copilot settings. A `memory-bank-config.json` file documents the recommended model but does not control agent behavior.

An optional `scripts/update-model.sh` script exists for users who want to explicitly pin a version — it adds the `model` field back to all agent files from a single command.

## Alternatives Considered

### Hardcode latest version everywhere
Pin e.g. `model: 'Claude Opus 4.6'` in every agent file.
- **Pro:** Explicit, guaranteed to use the intended model
- **Con:** Goes stale with every model release, requires editing multiple files
- **Rejected because:** Already failed twice (Opus 4 → Opus 4.5 → Opus 4.6). Will fail again.

### Centralized config + propagation script (mandatory)
Config file defines the model, script propagates it to all agent files. Run the script on every model upgrade.
- **Pro:** Single source of truth, only one file to edit
- **Con:** Requires running a script after every model update. If you forget, agents use the old version. VS Code can't read config natively — it only reads .agent.md frontmatter.
- **Rejected because:** Adds a manual step that's easy to forget. The script exists as an opt-in tool, not a requirement.

### Remove model field + no config file
Just remove model from agents, don't document the recommendation anywhere.
- **Pro:** Simplest approach
- **Con:** No record of which model the project was designed for
- **Rejected because:** The config file costs nothing and serves as documentation.

## Consequences
- Agents always use the user's current default model — zero maintenance on model upgrades
- `memory-bank-config.json` documents the recommended model for reference
- `scripts/update-model.sh` is available for users who want explicit pinning
- If VS Code adds variable substitution to `.agent.md` in the future, this decision can be revisited
- Quality-first approach: user is expected to configure Claude Opus (latest) as their default
