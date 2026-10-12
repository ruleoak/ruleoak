# EffectReceipt

EffectReceipt separates **requested execution** from the outcome an adapter could actually observe.

## Versions

EffectReceipt v1.0 remains readable for historical evidence. Its legacy observation qualities are `complete-for-adapter`, `partial`, `inferred`, and `unavailable`.

New receipts use **EffectReceipt v1.1 / Observation Quality**. The v1.1 observation qualities are:

- `requested_only` — RuleOak can establish only that the execution boundary received/attempted the request. Status must remain `unknown`.
- `process_return_observed` — the adapter observed a local process/API return at its process boundary.
- `local_state_observed` — the adapter performed a bounded local-state verification.
- `remote_response_observed` — the adapter observed a response from a remote endpoint; this does not by itself prove the remote business effect completed.
- `complete_for_adapter` — the adapter completed every verification step in its **declared observation boundary**. This is never system-wide omniscience.
- `partial` — only part of the adapter's intended observation could be established; status is `partial` or `unknown`.
- `ambiguous` — the adapter cannot distinguish materially different external outcomes; status must remain `unknown`.

Every v1.1 receipt includes a bounded machine-readable `observation_boundary`. Adapter Contract v1.1 declares the exact quality/boundary/status combinations an adapter may claim, and conformance validation rejects stronger claims.

A successful HTTP transport response is therefore not automatically a successful business effect. For example, RuleOak's MCP HTTP gateway records `remote_response_observed` with `status: unknown` until stronger evidence exists.

Observation Quality values are **categorical evidence semantics**, not a numeric confidence score and not a risk score. RuleOak does not rank `remote_response_observed`, `local_state_observed`, and `process_return_observed` as a universal linear scale; each names a different observation boundary.
