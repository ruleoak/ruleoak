# Commercial extension SPI

RuleOak Core remains fully useful under Apache-2.0. v0.50.0 exposes a public, versioned extension boundary so optional integrations can extend RuleOak without forking authority semantics.

SPI version: `1.0`.

Supported extension kinds:

- `organization_policy` — supplies an additional organization policy document for explicit composition by the host.
- `approval` — routes approval requests to one configured provider.
- `event_sink` — receives explicitly selected RuleOak metadata events.
- `inspector_intelligence` — adds non-authoritative capability intelligence. It is rejected if it tries to return allow/deny/policy/lease/authority decisions.
- `crashlab_scenario` — supplies validated CrashLab scenarios.

## Data contract

Descriptors must declare their data classes. The SPI deliberately has no descriptor value for raw prompts, source code or credentials. Current public data classes are normalized actions, authority metadata, effect metadata, capability metadata and scenario metadata.

An extension also declares whether network access is `none`, `optional` or `required`. This declaration is descriptive and should be surfaced to the operator before enabling an extension.

## Commercial boundary

The public repository contains the SPI, validation, conformance tests and local memory/static reference providers. Proprietary implementations should live outside `ruleoak/ruleoak`, in an out-of-tree private implementation.

Do not move Authority Envelope, Execution Lease, Effect Receipt, Policy v2, Inspector basic capability analysis, Flight Recorder verification or CrashLab basic into a proprietary package. Those remain the public trust foundation.
