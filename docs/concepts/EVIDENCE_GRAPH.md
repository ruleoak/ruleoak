# Evidence Graph

RuleOak Evidence Graph is a read-only derived evidence view. It correlates the verified Authority Graph with the append-only Flight Recorder chain.

It answers: **what authority and approval existed, which lease was issued, which adapter executed, what effect was observed, and which recorder events support that reconstruction?**

## Sources

Evidence Graph accepts only:

- a structurally valid, semantic-digest-valid Authority Graph; and
- a Flight Recorder event sequence that passes the existing hash-chain verifier.

A broken recorder chain is rejected. Evidence Graph does not repair, reorder, or rewrite source evidence.

## Evidence-specific nodes

In addition to Authority Graph nodes, Evidence Graph adds:

- `adapter`
- `recorder_event`

Effect nodes remain the privacy-minimized Authority Graph projection: raw requested/observed effect bodies are not copied.

## Missing evidence

Evidence Graph never invents a success or failure. Missing source artifacts remain in `unresolved_references`.

In particular, if the recorder proves a lease was consumed but no EffectReceipt is available for that lease, the graph records `consumed_without_effect_receipt`.

## Semantic identity

`graph_id` is a deterministic SHA-256 digest over the verified source identity, nodes, edges, and unresolved references. `generated_at` does not alter semantic identity.

## CLI

```bash
ruleoak evidence graph --dir . --json
ruleoak evidence trace --dir . --id effect:<effect-id>
ruleoak evidence timeline --dir . --from <iso> --to <iso> --json
```

These commands are read-only.
