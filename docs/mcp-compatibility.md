# MCP-style JSON-RPC compatibility

RuleOak validates supported JSON-RPC 2.0 message behavior commonly used by MCP clients and servers at its stdio gate.

## Covered behavior

- lifecycle and non-tool messages pass through unchanged
- `tools/call` requests are normalized and authorized before forwarding
- denied requests receive a RuleOak JSON-RPC error
- approval-required requests use a distinct retryable error code
- denied notifications are dropped without a JSON-RPC response
- mixed batches forward only allowed items
- denied batch request responses are emitted as a JSON-RPC response array
- malformed and incomplete JSON-like input fails closed

## Error codes

| Code | Meaning |
|---:|---|
| `-32001` | action denied by RuleOak policy or risk guard |
| `-32002` | action requires approval and was not forwarded |
| `-32700` | malformed or incomplete JSON input |

## Run compatibility fixtures

```bash
npm run check:mcp-compatibility
```

Fixtures are stored under `examples/mcp-compatibility/` and cover initialization, notifications, allowed reads, denied destructive calls, and mixed batches

## Scope

This release focuses on stdio JSON-RPC framing. It does not yet claim complete compatibility with every MCP transport, authentication model, HTTP streaming implementation, or client-specific extension
