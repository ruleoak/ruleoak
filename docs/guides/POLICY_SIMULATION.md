# Policy simulation and diff

Preview one call without executing it:

```bash
ruleoak policy simulate --call call.json --dir .
```

Compare policy semantics:

```bash
ruleoak policy diff --before policy-a.json --after policy-b.json
```

Simulation uses the same deterministic evaluator used by enforcement. Diffing identifies broad/default changes and added, removed or modified exact/structured rules. Neither command mutates active policy.
