# ADR-0003: Use Memory Bank Structure Instead of Separate PRD

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** user216

## Context
When starting this project, we needed to decide how to document requirements and track progress. The options were: a traditional PRD (Product Requirements Document), ADRs (Architectural Decision Records), the memory bank structure itself, or some combination.

## Decision
Use the memory bank structure as the primary documentation system. Specifically:
- `projectbrief.md` replaces PRD (project scope, goals, non-goals, success criteria)
- `productContext.md` replaces PRD sections on user needs and UX goals
- `decisions/` folder houses ADRs (which have unique properties memory bank files cannot replicate)
- No separate PRD document is maintained

## Alternatives Considered

### Separate PRD + ADRs + Memory Bank
Maintain all three systems independently.
- **Pro:** Each system is purpose-built for its role
- **Con:** Three places to look for project information, duplication between PRD and projectbrief/productContext
- **Rejected because:** Duplication leads to drift. One source of truth is better.

### Memory Bank only (no ADRs)
Use only the 7 standard memory bank files, no decisions/ folder.
- **Pro:** Simplest approach, fewest files
- **Con:** Memory bank files are living documents (overwritten). No immutable record of WHY decisions were made or what alternatives were rejected.
- **Rejected because:** ADRs serve a unique purpose — immutable decision history — that living documents cannot replicate.

### PRD + Memory Bank (no ADRs)
Use PRD for requirements, memory bank for state, skip ADRs.
- **Pro:** PRD adds formal structure for requirements
- **Con:** PRD extras (personas, metrics, release planning) are unnecessary for a personal project. projectbrief.md + productContext.md cover the same ground.
- **Rejected because:** PRD has no unique value beyond what memory bank files already provide.

## Consequences
- Single system to maintain (memory bank + nested decisions/)
- `projectbrief.md` must include non-goals and success criteria (traditionally PRD territory)
- ADRs preserve the immutable "why" that living documents cannot
- New contributors only need to learn one documentation system
- The decisions/ folder follows the same pattern as tasks/ (index + individual files)
