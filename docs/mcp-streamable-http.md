# MCP Streamable HTTP gateway

Start a loopback gateway:

```bash
ruleoak mcp http \
  --dir ./workspace \
  --listen 127.0.0.1:7332 \
  --upstream http://127.0.0.1:8000
```

The gateway:

- inspects JSON-RPC `tools/call` before forwarding
- preserves request IDs and non-tool lifecycle messages
- consumes the allow receipt once before upstream forwarding
- proxies allowed streaming and `text/event-stream` responses
- queues approval-required calls locally
- redacts sensitive arguments in evidence
- never forwards denied calls

Mixed allowed/denied batches are merged when the upstream returns JSON. Mixed batches cannot be merged into an SSE stream and fail closed with `RULEOAK_MIXED_BATCH_STREAM_UNSUPPORTED`.

## Legacy SSE compatibility

SSE responses from an allowed upstream request are transparently proxied. RuleOak does not make legacy SSE the policy or transport abstraction; authorization remains transport-independent.

## Non-loopback deployment

Non-loopback binding requires:

```bash
export RULEOAK_API_TOKEN='long-random-token'
ruleoak mcp http \
  --listen 0.0.0.0:7332 \
  --allow-non-loopback \
  --auth-token-env RULEOAK_API_TOKEN \
  --upstream http://127.0.0.1:8000
```

Use TLS and a trusted reverse proxy outside a single host. The built-in bearer token is a minimal deployment guard, not an enterprise identity service.
