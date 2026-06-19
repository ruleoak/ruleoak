# RuleOak Runtime Lifecycle

RuleOak Core provides a local-first governance runtime for AI tool-call workflows.

The runtime wires the core governance loop:

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

## What the runtime proves

RuleOak makes the governance pattern executable:

```text
policy-bound actions
+ evidence-backed recommendations
+ approval gates
+ audit-style outputs
+ local report generation
```

## Boundary

RuleOak Core is a developer-oriented, local-first governance runtime. It is not a certified compliance product, hosted cloud service, or externally security-reviewed sandbox.
