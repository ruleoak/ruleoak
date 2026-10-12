# Inspect an MCP Server

Use `ruleoak inspect mcp -- <command>` for a local stdio server or `ruleoak inspect mcp <url>` for a remote endpoint. Inspection uses discovery/list operations and does not invoke discovered state-changing tools. Save a compact capability fingerprint with `--save <name>` and compare later with `--compare <name>`.
