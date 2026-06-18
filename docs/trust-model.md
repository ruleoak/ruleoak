# Trust Model

RuleOak treats trust as a runtime property, not a prompt style.

A governed workflow should answer four questions:

```text
What is allowed?
What evidence supports the output?
What requires approval?
What record remains afterward?
```

## The RuleOak pattern

| Layer | Purpose |
|---|---|
| Policy | Define allowed, blocked, and approval-gated actions |
| Evidence | Attach sources, logs, metrics, notes, or documents to recommendations |
| Approval | Pause before risky or irreversible actions |
| Audit | Record the run, decisions, evidence, and outputs |
| Sandbox foundation | Add concrete filesystem, network, command, and tool boundaries |

## v1.3 boundary

RuleOak Core v1.3 includes an early runtime and sandbox foundation. It is suitable for learning, prototyping, and building controlled workflows. It is not yet a mature enterprise platform, certified compliance product, or externally security-reviewed sandbox.
