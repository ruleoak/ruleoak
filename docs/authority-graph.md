# Authority Graph

RuleOak v0.50.0 includes a **read-only explanatory projection** over existing authority and effect artifacts.

It does not grant authority, approve actions, revoke authority, issue an ExecutionLease, or alter policy decisions.

## Graph path

```text
principal
  → grant
  → envelope
  → decision / approval context
  → lease
  → effect
```

The graph uses only explicit relationships already present in RuleOak artifacts. Missing inputs are represented in `unresolved_references`; RuleOak does not fabricate missing grants, decisions, envelopes, leases, or effects.

## Nodes

Authority Graph v1 supports:

- `principal`
- `grant`
- `envelope`
- `decision`
- `approval`
- `lease`
- `effect`

Principal nodes include explicit principal-chain identities from Authority Grants. A decision or lease may establish only a principal identifier; it does not invent a principal type.

## Privacy projection

The graph is intended for local explanation and still minimizes payload content. It does not copy:

- normalized-call arguments
- raw tool payloads
- EffectReceipt `requested` / `observed` bodies
- approval provider context
- policy traces
- capability bodies
- signatures

It retains bounded explanatory metadata such as identifiers, time bounds, action/resource identities, policy/action digests, decision status, effect status, observation quality, and counts.

## Integrity

`graph_id` is a semantic SHA-256 digest over nodes, edges, and unresolved references. `generated_at` is excluded from semantic identity. Query and explanation APIs reject a structurally valid graph whose content no longer matches `graph_id`.

## CLI

```bash
ruleoak authority graph --dir . --json
ruleoak authority graph --dir . --out ./authority-graph.json
ruleoak authority query --dir . --kind lease
ruleoak authority query --dir . --kind decision --ref dec_123
ruleoak authority explain --dir . --id effect:effect_123
```

`--out` writes a local graph file with private file permissions where supported.

## Approval Contract integration

With the Approval Contract, Authority Graph can project explicit relationships from the original needs-approval decision to the approval, from the approval to the resolved DecisionReceipt, and from the approval to an approval-bound ExecutionLease v1.2. Legacy approval records remain best-effort explanatory inputs; missing causal identifiers remain unresolved rather than fabricated.

## Deferred

Effect Evidence builds on the Authority Graph through the Evidence Graph.
