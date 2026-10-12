# RuleOak concepts map

This page gives a compact map of the public concepts used across RuleOak documentation.

| Concept | Meaning | What it does not mean |
|---|---|---|
| **Principal** | Identity within the RuleOak authority model. | Proof of real-world identity by itself. |
| **Authority Envelope** | Bounded authority, delegation and constraints for a principal/action context. | Permission to bypass policy or execution controls. |
| **Policy** | Deterministic rules evaluated against normalized action context. | Proof that an external effect happened. |
| **Approval** | Explicit provider/human decision when policy requires it. | An unlimited or reusable execution grant. |
| **ExecutionLease** | Short-lived, one-use authority bound to the reviewed action. | A bearer token intended for repeated execution. |
| **EffectReceipt** | Structured execution/effect observation record. | Automatic proof of an external postcondition. |
| **Effect Profile** | Trusted semantics for checking a supported external effect. | Semantics inferred solely from a generic tool name. |
| **Observation quality** | Strength/limits of the available effect evidence. | A confidence score that converts unknown into known. |
| **Retry disposition** | `do_not_retry`, `safe_to_retry_with_new_authority` or `verify_before_retry` style outcome. | Permission to reuse a consumed lease. |
| **Flight Recorder** | Redacted local evidence chain and replay/inspection surfaces. | Tamper-proof storage against a privileged local adversary. |
| **Inspector** | Capability discovery, normalization and fingerprinting. | Authorization. Discovery never grants authority. |
| **Capability Watch** | History/drift tracking for discovered capability metadata. | Runtime access control by itself. |
| **CrashLab** | Reproducible failure/retry/staleness/concurrency scenarios. | Independent production certification. |
| **RuleOak Verify** | Governed source/candidate verification modes. | A model deciding that its own work is correct. |

## Relationship

```text
Principal
   ↓
Authority Envelope
   ↓
normalized action → Policy → Approval if required
                              ↓
                       ExecutionLease
                              ↓
                         execution
                              ↓
                        EffectReceipt
                              ↓
                        Effect Profile
                              ↓
                      retry disposition
                              ↓
                     Flight Recorder
```

See the individual concept documents under `docs/concepts/` for contract detail.
