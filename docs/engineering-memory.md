# Executable Engineering Memory (Engineering Memory)

Engineering Memory turns selected engineering history into a local, versioned planning input under `.ruleoak/memory/*.json`.

A memory record is not conversational memory and is not current verification evidence. It carries an explicit type, provenance, status, optional validity window, capability/invariant/evidence links, and—only for relevant historical regressions—additional evidence types or plan actions.

Supported record types are `Observation`, `Incident`, `Cause`, `Decision`, `Resolution`, `Regression`, `InvariantIntroduced`, `Evidence`, and `Supersession`.

Use:

```text
ruleoak memory validate .ruleoak/memory/ruleoak-community.memory.json
ruleoak memory relevant "prevent blind retry when effect verification is uncertain"
```

Engineering Memory integrates with `understand`, `impact`, `context`, and `change`. Relevant regressions can add protecting invariants, plan actions, and required evidence types. They cannot satisfy Intent Evidence Authority evidence requirements and cannot upgrade a candidate to PASS.

Expired, not-yet-effective, and superseded records are ignored for current planning. Matching remains deterministic and conservative; irrelevant history should not constrain unrelated work.
