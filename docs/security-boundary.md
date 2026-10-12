# Security boundary

RuleOak controls actions only when the agent, SDK, process, MCP client, or service deliberately routes the action through a RuleOak boundary.

## In scope

- pre-action policy evaluation
- contextual risk classification
- human approval requests
- action/policy-bound decision receipts
- one-time receipt consumption
- redacted hash-chained evidence
- stdio JSON-RPC interception
- MCP Streamable HTTP proxying
- loopback REST authorization
- guarded Node.js tool/function execution

## Out of scope

- kernel-level syscall interception
- operating-system sandboxing
- malware detection
- complete prompt-injection prevention
- complete data-loss prevention
- endpoint identity proof
- network TLS termination
- enterprise identity federation
- actions that bypass the guarded executor or transport

## Transport assumptions

The stdio and Streamable HTTP gateways preserve transport request IDs, but request IDs are not authorization identities. Non-loopback services require explicit bearer authentication and should run behind TLS. Mixed JSON-RPC batches with an SSE upstream cannot be safely merged and fail closed.

## SDK assumptions

A developer must call the guarded function rather than a retained unguarded executor. The wrapper executes the implementation once, after allow and receipt consumption. Object results can carry non-enumerable decision/evidence metadata; primitive results require envelope mode or the execution callback.

## Local storage assumptions

The `.ruleoak` directory is protected with restrictive permissions where supported. A local user with permission to alter policy, evidence, approval files, or signing secrets remains inside the local trust boundary.

## Secrets and signatures

HMAC receipts and checkpoints use shared-secret trust. Native credential stores are preferred. Environment variables are suitable for CI but can be exposed by local process inspection. Secret heuristics are defense-in-depth and can produce false positives or negatives.

## Learning mode

Learning mode observes and proposes only. It cannot automatically apply policy or transform a critical deny into allow.

## Direction of enforcement

For transport wrappers, RuleOak evaluates client-to-server action requests before they reach the guarded server. It does not observe actions that bypass the wrapper and does not prevent side effects performed through an unguarded path.
