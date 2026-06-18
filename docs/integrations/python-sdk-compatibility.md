# Python SDK compatibility note

RuleOak Core is the canonical runtime and protocol reference.

The private-preview `ruleoak-py` SDK should emit records compatible with:

```text
ruleoak.governance.v1
```

Recommended validation path:

1. Generate governance records from Python.
2. Place the generated records beside RuleOak Core conformance fixtures or a temporary conformance folder.
3. Validate their structure against the RuleOak Core JSON schemas.
4. Keep Python field names and effect values aligned with the Core protocol docs.

`ruleoak-py` should remain a bridge, not a fork of the runtime. Its highest-value role is enabling Python vertical apps to emit RuleOak-compatible policy, evidence, approval, audit, report, and governed LLM records.

Public note: the Python SDK remains private preview until licensing, API stability, and contribution boundaries are finalized.
