# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly by opening a private security advisory on GitHub rather than a public issue.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Scope

This project stores project context as local markdown files. The MCP server provides read/write access to these files over stdio. The VS Code extension runs locally.

- The MCP server binds only to stdio (no network listeners)
- No credentials, tokens, or secrets are stored in memory bank files
- All data remains local to the workspace
