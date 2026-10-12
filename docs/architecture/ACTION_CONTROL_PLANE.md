# Agent Action Control Plane

RuleOak governs externally proposed actions at supported boundaries. The authority calculation is deliberately intersecting and fail-closed:

`Authority Grant ∩ Authority Envelope ∩ revocation state ∩ RuleOak policy ∩ built-in safety guards`.

An allow decision is followed by a bounded `ExecutionLease`. Execution and observed outcome are separate; `EffectReceipt` records only what the adapter can truthfully observe.
