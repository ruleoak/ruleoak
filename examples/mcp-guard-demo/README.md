# MCP Guard Demo

This demo shows RuleOak Core evaluating MCP-style `tools/call` requests before execution.

```bash
npm run mcp:demo
```

The demo is local-only. It does not run an MCP server and does not call the network. It uses a local server manifest fixture and demonstrates:

- read-only tool allowed
- external-message tool approval-required
- destructive tool blocked
- audit-style report generation
