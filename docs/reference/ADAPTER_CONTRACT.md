# Adapter Contract

Adapter Contract v1.1 makes observation authority explicit. A descriptor declares a stable `adapter_id`, whether the adapter is a normalizer or execution adapter, and a list of `observation_capabilities`.

Each observation capability has:

- `quality` — an EffectReceipt v1.1 Observation Quality value;
- `boundary` — a bounded machine-readable name for what the adapter actually observes;
- `statuses` — the effect-status values that the adapter may claim at that boundary.

EffectReceipt conformance is fail-closed: a receipt's adapter, quality, boundary, and status must match a declared capability. `complete_for_adapter` means complete only within the adapter's declared observation boundary; it never means system-wide truth.

Adapter Contract v1.0 remains supported for historical compatibility with EffectReceipt v1.0. New built-in descriptors use v1.1.

Normalization does not itself grant execution authority. A normalize-mode descriptor can describe observation metadata used by a separate governed execution boundary, but RuleOak still requires the normal Authority → Decision → ExecutionLease path before an effect-producing action.
