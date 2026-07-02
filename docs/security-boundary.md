# RuleOak stream interception boundary

RuleOak's Phase 5 runner is a stdio / JSON-RPC stream gate.

## What it intercepts

`ruleoak run -- <command>` intercepts JSON-RPC requests flowing from the parent/client into the child process before the child receives them. In the MCP server shape, this is the important direction: `client -> server` over stdin. Tool calls are evaluated before forwarding.

RuleOak currently handles:

- JSON-RPC `tools/call` objects
- pretty-printed / multi-line JSON objects
- JSON-RPC batch arrays
- non-JSON noise on the same stdin stream
- hash-chained evidence for every intercepted tool call
- JSON-RPC error responses for blocked calls

## What it does not intercept

RuleOak does not claim kernel-level syscall interception.

It does not observe:

- in-process function calls that never cross stdin/stdout
- arbitrary compiled binaries that perform syscalls internally
- filesystem writes that happen outside RuleOak-observed streams
- network calls that happen outside RuleOak-observed streams
- a real MCP gateway over SSE or stdio proxying multiple servers yet

Those are roadmap items or require different interception layers.

## Failure behavior

RuleOak fails closed on malformed policy configuration. A malformed policy prevents the child command from starting.

Malformed or incomplete JSON-like stdin payloads are not forwarded to the child process. RuleOak emits a JSON-RPC parse error response instead.

## HTML report safety

`ruleoak replay --html` generates a local, single-file report with inline CSS only. It does not load Tailwind, CDN scripts, fonts, or remote assets. Every interpolated value from the evidence log is HTML-escaped, including action names, matched rules, reasons, hashes, and tool arguments.
