# Capability History

RuleOak v0.50.0 includes **CapabilityObservation v1** and an append-only historical capability graph built on stable capability identities.

## Observation model

Each observation records only normalized capability metadata:

- stable `integration_id` and `capability_id`;
- integration/action names;
- observation time;
- lifecycle state;
- explicit drift categories;
- normalized state/consequence/schema digest/classification basis;
- publication-safe historical evidence metadata;
- `previous_observation_id` for the per-capability append chain.

The observation digest is deterministic for the same normalized observation payload.

## Lifecycle states

- `first_seen` — first observation of the stable capability identity;
- `present` — capability remains present;
- `removed` — previously present capability is absent;
- `reintroduced` — a previously removed stable capability identity appears again.

A rename remains removal plus addition because the capability-identity contract intentionally treats the action name as part of stable capability identity.

## Drift categories

RuleOak distinguishes:

- `metadata_change`
- `schema_change`
- `capability_expansion`
- `capability_contraction`
- `consequence_escalation`
- `consequence_reduction`
- `provenance_change`
- `transport_change`
- `classification_basis_change`

Observation time alone is **not** drift. A source/provenance change is not mislabeled as capability expansion.

## Append-only JSONL store

`FileCapabilityHistoryStore` stores one validated observation per JSON line. It is bounded by default to 8 MiB, 64 KiB per line, and 50,000 observations. It:

- treats an already-present `observation_id` as an idempotent duplicate;
- rejects corrupt JSON with a line number;
- rejects malformed observations;
- rejects duplicate IDs inside stored history;
- validates the per-capability `previous_observation_id` chain;
- rejects non-increasing timestamps for the same capability;
- rejects invalid lifecycle transitions;
- fails explicitly when configured size/count limits are exceeded.

The store is local-first and does not upload history.

## Privacy boundary

Capability observations intentionally do not store raw tool descriptions, raw schemas, prompts, credentials, local paths, or private endpoints. Classification basis is reduced to the bounded RuleOak classification fields. Historical evidence receives a new deterministic evidence digest that includes the `historical_observation` class instead of mutating the original evidence object in place.

Publication still requires the caller to know that the integration itself is public. the capability-history contract provides a publication-safe **representation**, not permission to publish a private integration.

## Evidence is not authority

History describes observed capability evolution. It does not grant permission, create approvals, create Authority Envelopes, or issue ExecutionLeases.
