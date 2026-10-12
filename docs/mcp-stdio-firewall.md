# MCP stdio firewall

```bash
ruleoak mcp wrap --dir ./workspace -- node mcp-server.js
```

The stdio gate identifies JSON-RPC `tools/call` messages, applies the shared RuleOak authorization pipeline, and forwards only allowed items. For consequential calls it also creates and consumes a one-use `ExecutionLease`, persists an inflight effect before dispatch, correlates the child response, emits an `EffectReceipt`, independently verifies any supported postcondition, and records the retry disposition. Lifecycle and non-tool messages pass through.

Deterministic errors:

- `-32001`: denied
- `-32002`: approval required
- `-32700`: malformed or incomplete JSON

For batches, allowed items are forwarded and denied request items receive individual error responses. Notifications are dropped on deny because JSON-RPC notifications do not receive responses.

The gate is a stream boundary, not process sandboxing. In-process tool calls that never cross the wrapped stdio stream are outside this integration.


## Supported automatic postconditions

For local filesystem-shaped MCP calls, RuleOak conservatively infers exact postconditions for `write_file`, `create_directory`, file `move_file`, and exact-unique `edit_file` operations. It captures the relevant pre-dispatch state so a failed/lost response is not confused with proof of no effect. Symlinks and filesystem states that cannot be bound to an exact postcondition are not automatically certified.

A consequential JSON-RPC notification without an `id` is rejected because RuleOak cannot correlate its execution outcome. Unknown consequential tools can still be authorized and executed once, but without a safe verifier their effect state remains `unknown` and retry remains blocked pending manual/explicit verification.

If the child exits before returning a tracked response, RuleOak finalizes the attempt as ambiguous and immediately checks the captured postcondition. If RuleOak itself is interrupted after dispatch, the inflight journal is recovered by `ruleoak effect reconcile`; recovery never executes the original tool call.
