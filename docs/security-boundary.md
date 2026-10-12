# Security boundary

RuleOak controls actions only when the agent, SDK, process, MCP client or service deliberately routes the action through a RuleOak boundary.

## Security objective

For a guarded consequential action, RuleOak aims to make the following chain explicit and reviewable:

```text
normalized action → authority/policy → approval if needed → one-use execution → effect evidence → retry disposition
```

It does not claim universal containment of the caller or host.

## In scope

- pre-action policy evaluation;
- contextual risk classification;
- human/provider approval requests;
- action/policy-bound decision receipts;
- short-lived one-use execution authority;
- replay/stale-state/revocation checks;
- Effect Receipts and observation quality;
- trusted postcondition verification for supported Effect Profiles;
- redacted hash-chained local evidence;
- stdio JSON-RPC interception;
- MCP Streamable HTTP proxying for documented behavior;
- loopback REST authorization;
- guarded Node.js tool/function execution.

## Out of scope

- kernel-level syscall interception;
- operating-system sandboxing;
- endpoint malware detection;
- complete prompt-injection/goal-hijack prevention;
- complete DLP;
- external identity proof/federation;
- network TLS termination;
- actions that bypass the guarded executor or transport;
- automatic effect semantics for arbitrary/custom tools.

## Enforcement and bypass

For transport wrappers, RuleOak evaluates client-to-server action requests before they reach the guarded server. It cannot observe or prevent side effects performed through an alternate direct route.

For SDK integrations, the developer must invoke the guarded function/tool rather than a retained unguarded executor. Treat unguarded references as a bypass path in the application threat model.

## Effect semantics boundary

A successful policy decision is not a successful external effect. Effect verification requires trusted postcondition semantics. Unsupported/custom semantics must remain explicit unknown/manual-review work.

## Transport assumptions

The stdio and Streamable HTTP gateways preserve transport request IDs, but request IDs are not authorization identities. Non-loopback services require explicit bearer authentication and should run behind TLS. Unsupported/malformed protocol behavior fails closed where the documented contract requires it.

## Local storage assumptions

The `.ruleoak` directory uses restrictive permissions where supported. A local actor who can modify RuleOak policy, approval state, evidence or signing secrets remains inside the local trust boundary and can undermine local-only guarantees.

For stronger assurance, export/checkpoint evidence outside the host and protect secrets with native credential stores or equivalent controls.

## Secrets and signatures

HMAC receipts/checkpoints use shared-secret trust. Native credential stores are preferred. Environment variables can be suitable for CI but may be visible to local process inspection. Secret heuristics are defense-in-depth and may produce false positives/negatives.

## Learning mode

Learning mode observes and proposes only. It cannot automatically apply policy or transform a critical deny into allow.

## Failure stance

Missing/conflicting decision-critical authority or effect evidence should narrow capability or preserve uncertainty rather than silently expanding permission or retrying.

See [Threat model](threat-model.md) for deployment-level questions.
