# RuleOak v1.3 Early Runtime Lifecycle

RuleOak Core v1.3 moves from demo scripts plus contracts to an **early runtime**.

It is still not a mature enterprise runtime, but the demos now run through real runtime modules:

```text
RunManager
→ PolicyEngine
→ EvidenceStore
→ ApprovalGate
→ AuditLog
→ ReportExporter
```

## Runtime lifecycle

```text
create run
→ start run
→ add evidence
→ evaluate proposed action
→ request approval if required
→ complete run
→ export report
```

## Runtime modules

| Module | Purpose |
|---|---|
| `RunManager` | Owns run lifecycle, runtime report shape, and module wiring. |
| `PolicyEngine` | Evaluates actions as allowed, blocked, approval-required, or unknown. |
| `EvidenceStore` | Normalizes and records evidence records. |
| `ApprovalGate` | Creates pending approval requests for risky actions. |
| `AuditLog` | Records run, evidence, policy, approval, and completion events. |
| `ReportExporter` | Writes structured runtime reports to disk. |

## What v1.3 proves

v1.0 proves that the RuleOak pattern is executable as a small runtime:

```text
policy-bound actions
+ evidence-backed recommendations
+ approval gates
+ audit-style outputs
```

## What v1.3 does not claim

v1.0 is not yet:

- mature enterprise runtime;
- security-reviewed sandbox;
- certified compliance product;
- hosted cloud service;
- finished commercial vertical app.
