# MCP local proxy real example

Run:

```bash
npm run adapter:mcp:real
```

This starts a local loopback RuleOak MCP Guard Proxy and sends JSON-RPC `tools/call` requests through it. The proxy demonstrates allow, approval-required, and blocked outcomes before a tool handler is invoked.
