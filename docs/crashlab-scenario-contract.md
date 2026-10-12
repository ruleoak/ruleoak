# CrashLab Failure Taxonomy & Scenario Contract

CrashLab Scenario v2.0 defines the base failure taxonomy. Scenario v2.1 adds backward-compatible concurrency and stale-state execution semantics. Reliability Scorecard & CI reports over those results without changing scenario execution.

## Failure phases

- `before_authorization`
- `after_authorization_before_effect`
- `before_effect`
- `after_effect_before_response`
- `partial_effect`
- `before_response`

## Failure classes

- `timeout`
- `response_loss`
- `token_expiry`
- `revocation_race`
- `concurrent_race`
- `stale_capability`
- `stale_policy`
- `stale_approved_baseline`
- `eventual_consistency`
- `transport_failure`
- `local_process_crash`
- `duplicate_retry`
- `synthetic_error`

The runtime validator and shipped JSON Schema enforce class/phase compatibility.

## Scenario v2.0

v2.0 remains valid and preserves its published contract. The richer concurrency/staleness families remain deliberately non-executable under v2.0 so historical semantics do not change underneath existing scenarios.

## Scenario v2.1

v2.1 adds bounded state and concurrency declarations.

### Deterministic concurrent one-use authority

```json
{
  "scenario_version": "2.1",
  "scenario_id": "generic.concurrent.one-use",
  "name": "Concurrent actors share one-use authority",
  "target": {
    "adapter_id": "synthetic-target",
    "domain": "generic",
    "action": "resource.write",
    "resource": "synthetic://x",
    "idempotency": "required",
    "idempotency_key": "x"
  },
  "authority": { "initial_state": "valid" },
  "fault": {
    "phase": "before_effect",
    "class": "concurrent_race",
    "on_attempt": 1,
    "repeat": "once"
  },
  "retry": {
    "max_attempts": 1,
    "strategy": "none",
    "preserve_idempotency_key": true
  },
  "concurrency": {
    "actors": 3,
    "schedule": "deterministic_barrier",
    "shared_authority": "one_use"
  },
  "expect": {
    "effect_count": { "min": 1, "max": 1 },
    "authority_behavior": "one_winner",
    "evidence": {
      "quality": "local_state_observed",
      "status": "success",
      "ambiguity": "none"
    },
    "invariants": [
      "one_use_authority",
      "authority_containment",
      "duplicate_effect_resistance",
      "recovery_correctness"
    ]
  }
}
```

The synthetic scheduler is deterministic for reproducibility. All contenders are pre-authorized before the one-use consumption barrier; exactly one `lease.consumed` event may occur and later contenders are recorded as `lease.replayed`, not as retroactive authorization denials. RuleOak also regression-tests the real file-backed ExecutionLease consumption barrier with two separate processes held on a shared readiness barrier before release, so the one-use invariant is exercised against production replay storage under genuine overlap.

### Stale state

v2.1 can declare expected/current SHA-256 identities under:

- `state.capability`
- `state.policy`
- `state.approved_baseline`

The stale pair must differ. The corresponding stale-state failure class must reject execution before any effect and use the `stale_state_rejection` invariant.

### Eventual consistency

`state.consistency.visible_on_attempt` models a bounded period in which an already-applied effect is not yet visible. The visibility attempt must be later than the injected fault and reachable within the retry ceiling. A safe idempotent retry can therefore preserve the initial ambiguity while avoiding duplicate effects until visibility converges.

### Revocation during concurrency

A `revocation_race` scenario uses a deterministic concurrent schedule with `shared_authority: revocable` and a reachable `authority.revoke_on_attempt`. No effect may occur on or after the revocation point.

## Evidence semantics

Scenario evidence expectations reuse Observation Quality. These are categorical evidence semantics, not confidence/risk scores.

Historical Scenario v1.0/v1.1 and Scenario v2.0 remain readable/executable according to their established semantics. New concurrency/staleness scenarios should use v2.1.

## Reliability reporting

See [Reliability Scorecard & CI](reliability-scorecard.md) for deterministic human/JSON/JUnit/SARIF aggregation and CI exit semantics.
