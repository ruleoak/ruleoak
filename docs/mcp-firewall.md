# RuleOak MCP-style stdio firewall

RuleOak can wrap a child process and inspect JSON-RPC `tools/call` messages before forwarding them

```bash
ruleoak mcp wrap --dir ./workspace -- node server.mjs
```

The gate normalizes the tool name, arguments, target, category, operation, scope, and session context. It then runs the same permission pipeline used by `ruleoak check`:

1. risk classification
2. secret and prompt-injection guards
3. Policy v2 evaluation
4. decision receipt creation
5. evidence append
6. forward only on allow

## Safe integration guidance

- route all relevant client-to-server tool calls through the wrapper
- keep child stdout protocol-compatible
- use narrow policy rules and deny defaults
- do not assume RuleOak covers transports or side channels it cannot see
- use signed decision receipts if a separate execution component consumes authorization decisions
- run `ruleoak doctor` and `ruleoak policy lint` before production-like testing

## Current transport scope

The public implementation focuses on stdio JSON-RPC. It is not yet a complete multi-server MCP gateway, HTTP/SSE reverse proxy, OAuth authorization server, or capability broker

Run the isolated demo:

```bash
ruleoak demo mcp-firewall
```
