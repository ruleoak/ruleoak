# Evidence model

RuleOak separates **authority evidence** from **effect evidence**. This is essential because permission to execute and proof of outcome are different facts.

## Evidence layers

### 1. Normalized action identity

RuleOak first needs a stable representation of the operation and resource. Policy and approval are meaningful only when they bind to the action actually being executed.

### 2. Authority and policy evidence

The authority path records the applicable authority envelope, policy decision, approval state, revocation state, and constraints that existed when the action was considered.

### 3. One-use execution authority

An `ExecutionLease` binds permission to the reviewed action for a bounded time and is consumed once. A second use is rejected rather than treated as implicit permission to retry.

### 4. Execution/effect observation

An `EffectReceipt` records what RuleOak observed about dispatch/execution and the effect evidence available to the boundary. A transport-level success response is not automatically equivalent to a verified external postcondition.

### 5. Postcondition verification

A reviewed `Effect Profile` can define trusted, bounded checks for an operation/resource shape—for example verifying a digest, identifier, state transition, or other external condition. Generic names do not grant semantics by themselves.

### 6. Retry disposition

The evidence should support one of three broad outcomes:

- **do not retry** — the effect is confirmed;
- **retry only with fresh authority** — no effect is established and the operation is eligible for a new attempt;
- **verify before retry** — the evidence remains ambiguous.

### 7. Flight Recorder

The Flight Recorder preserves redacted local evidence for decisions, execution and effect state. Hash chaining and verification help detect corruption of the recorded sequence, but they are not a defense against every privileged-local-attacker scenario.

## What evidence does not mean

- A policy allow is not proof of execution.
- An `ExecutionLease` is not proof of effect.
- A successful HTTP/MCP response is not automatically proof of the intended business postcondition.
- A discovered tool schema is not authority.
- A capability fingerprint is not permission.
- A model explanation is not effect evidence.

## Evidence quality

The strongest evidence is independently observable, route-specific, bounded, and reproducible. Weak evidence should remain labelled as weak. Unknown evidence should remain unknown.

## Operational use

Useful commands include:

```bash
node packages/cli/bin/ruleoak.js record verify
node packages/cli/bin/ruleoak.js evidence timeline --limit 100
node packages/cli/bin/ruleoak.js evidence graph --out evidence-graph.json
node packages/cli/bin/ruleoak.js effect pending
node packages/cli/bin/ruleoak.js effect show --id <effect-id>
```

Use the evidence model to answer: **what was proposed, what was authorized, what was attempted, what was observed, and what remains unresolved?**
