# RuleOak MCP Guard Proxy Prototype

RuleOak Core v1.8 adds a local in-process MCP Guard Proxy prototype.

The pattern:

```text
AI client -> RuleOak MCP Guard Proxy -> MCP-style server handler
```

The proxy handles JSON-RPC `tools/call` requests and applies RuleOak governance before forwarding:

- allowed tools are forwarded to the configured handler
- approval-required tools return an approval-required error response
- blocked tools return a blocked error response

Commands:

```bash
npm run mcp:proxy:demo
npm run test:mcp-proxy
```

Boundary:

- no network listener
- no external MCP server
- no real credentials
- no destructive tool execution

This is a prototype integration boundary for future production MCP gateway work.
