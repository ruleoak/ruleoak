# Intent Evidence Authority v0.1 (experimental)

RuleOak Intent Evidence Authority adds a separate evidence-adjudication layer for Intent-Verified Development. It does **not** replace the existing runtime Evidence Graph used for authorization/effect history.

The Intent Evidence Authority authority chain is:

```text
Intent claim
  -> EvidenceRequirement
  -> typed Evidence
  -> Observation
  -> provenance + verification method + validity window
  -> PASS / FAIL / UNKNOWN / NOT_RUN / STALE / CONFLICTED
```

A coding model or agent may contribute an observation, but its assertion is never independent proof of its own implementation. `MODEL_INFERENCE`, `producer_kind=model|agent`, `verification_method=model_inference|self_assertion`, and unknown provenance cannot satisfy an independent evidence requirement.

## Commands

```bash
ruleoak evidence validate result.evidence.json
ruleoak evidence status --intent .ruleoak/intent/app.intent.json --evidence result.evidence.json
ruleoak verify --intent .ruleoak/intent/app.intent.json --evidence result.evidence.json
ruleoak prove claim.example --intent .ruleoak/intent/app.intent.json --evidence result.evidence.json
ruleoak coverage --intent .ruleoak/intent/app.intent.json --evidence result.evidence.json
ruleoak contradiction --intent .ruleoak/intent/app.intent.json --evidence result.evidence.json
```

When `--intent` is omitted, RuleOak requires exactly one `*.intent.json` under `.ruleoak/intent/`. When `--evidence` is omitted, all `*.evidence.json` files there are used. `--at <ISO-8601>` fixes the adjudication time for reproducible CI; otherwise current time is used.

`verify` exits `0` only for `PASS`, `2` for `FAIL`/`CONFLICTED`, and `4` for incomplete authority states (`UNKNOWN`, `NOT_RUN`, `STALE`).

## Evidence bundle

`intent-evidence-bundle-v0.1.schema.json` deliberately separates raw `observations` from typed `evidence`. Evidence records must explicitly bind to claims, evidence requirements, or capabilities. Intent Evidence Authority does not infer that an arbitrary test proves an arbitrary requirement.

Evidence types that can satisfy matching Intent requirements are STATIC, UNIT, INTEGRATION, PROPERTY, BUILD, RUNTIME, DEVICE, EXTERNAL, and MANUAL when backed by independently inspectable observations. MODEL_INFERENCE remains non-authoritative.

## Truth boundary

Intent Evidence Authority does not claim formal proof. `PASS` means all declared evidence-type slots for the adjudicated requirement have current, non-conflicting, independently inspectable PASS evidence under this experimental contract. Missing requirements or incomplete declarations remain visible rather than being guessed.
