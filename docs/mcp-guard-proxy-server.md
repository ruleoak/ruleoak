# RuleOak MCP Guard Proxy Server

RuleOak Core v2.1.0 includes a local MCP Guard Proxy server mode.

Pattern:

```text
AI client -> RuleOak MCP Guard Proxy -> MCP-style tool handler
```

The server accepts JSON-RPC 2.0 `tools/call` requests on local loopback, evaluates each call through RuleOak policy, and returns one of three outcomes:

- forwarded when allowed
- approval required when human review is required
- blocked when policy denies the action

## Command

```bash
npm run mcp:proxy:server:demo
```

## Safety boundary

The v2.1.0 server demo is local-only. It does not connect to an external MCP server, does not use credentials, and does not execute destructive tools. It is a concrete local proxy shape for future production adapters.
