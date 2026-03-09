# ADR-0001: Use SQLite for Memory Bank Index

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Developer

## Context
Need a local storage solution for indexing memory bank content.

## Decision
Use SQLite with FTS5 for full-text search capability.

## Alternatives Considered
- PostgreSQL — too heavy for local use
- File-based grep — insufficient for structured queries
- In-memory only — lost on restart

## Consequences
- Zero external dependencies for storage
- Single-file database per workspace
- References TASK-001 for implementation
