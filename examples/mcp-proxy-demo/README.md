# RuleOak MCP Guard Proxy Prototype

This demo shows a local in-process MCP-style proxy boundary:

```text
AI client -> RuleOak MCP Guard Proxy -> MCP-style server handler
```

The proxy evaluates `tools/call` JSON-RPC requests before forwarding.

- `search_docs` is forwarded.
- `send_external_message` returns approval-required.
- `delete_workspace_file` is blocked.

No network listener is opened. No external MCP server is called.
