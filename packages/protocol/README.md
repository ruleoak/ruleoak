# @ruleoak/protocol

Apache-2.0 public contracts and validators for RuleOak's Effect Boundary. The package defines the portable evidence and authority records that let implementations bind an exact authorization to one execution attempt, an observed effect, and a retry decision without treating a transport response as proof of an external-world outcome.

Key public contracts include Policy v2, Authority Grant, Authority Envelope, ApprovalRequest/ApprovalResult, ExecutionLease, EffectReceipt v1.0/v1.1, Authority Graph, Evidence Graph, authorization API, evidence formats, schemas and conformance vectors.

## Experimental Intent IR v0.1

The package also exposes the experimental `@ruleoak/protocol/intent` subpath and `schemas/intent-manifest-v0.1.schema.json`. Intent IR represents durable capabilities, goals, invariants, constraints, budgets, design/state authorities, risks, failures, fallbacks and evidence requirements independently of source-file layout. It does not grant execution authority. See `docs/architecture/intent-ir-v0.1.md`.

Brownfield Understanding additionally ships `schemas/repository-understanding-v0.1.schema.json`, the machine-readable graph shape used by the CLI brownfield overlay. The graph keeps `OBSERVED`, `DECLARED`, `INFERRED`, and `UNKNOWN` states distinct.

## Public Protocol Conformance

The published package includes `conformance/manifest.json`, `version-matrix.json`, eleven valid/invalid vector families, canonical JSON examples, and an implementation-neutral Node.js runner. See `conformance/README.md`.

## Public API Stability

The package ships machine-readable maturity and compatibility metadata under `stability/`: `api-maturity.json`, `stable-api-snapshot.json`, `compatibility-matrix.json`, and SHA-pinned historical stability floors. Stable protocol versions cannot be removed by a later release without the published deprecation process. Package-level status remains pre-1.0 preview.

## License

All current first-party RuleOak packages are Apache-2.0.
Semantic Impact additionally ships `schemas/semantic-impact-v0.1.schema.json`, the experimental machine-readable result shape for deterministic pre-implementation impact analysis. Impact conclusions remain inferred and do not confer execution or evidence authority.


## Intent Evidence Authority v0.1 (experimental)

`@ruleoak/protocol/intent-evidence` and the `intent-evidence-bundle-v0.1` / `intent-verification-v0.1` schemas define typed observations, provenance, evidence classes, validity and adjudication status for Intent-Verified Development. MODEL_INFERENCE and agent/model self-assertion are representable but cannot independently certify implementation correctness.

## Intent Change v0.1 (experimental)

`@ruleoak/protocol/intent-change` plus `intent-change-v0.1` and `implementation-proposal-v0.1` define the Intent-Driven Change plan/proposal contracts. The contract separates planner, implementer, reviewer and evidence-adjudicator authority and does not grant an implementation producer the right to expand scope or self-certify correctness.

### Engineering Memory v0.1 (experimental)

`@ruleoak/protocol/engineering-memory` and `schemas/engineering-memory-v0.1.schema.json` define provenance-aware engineering-history records used as planning inputs. Historical records are not current verification evidence.

### Model Execution v0.1 (experimental)

`@ruleoak/protocol/model-execution` defines provider-neutral execution/result contracts with explicit non-authoritative and external-evidence/tool-authority markers.

## RuleOak Verify Product Report v0.1 (experimental)

`@ruleoak/protocol/verify-product` and `schemas/verify-product-v0.1.schema.json` define the agent-neutral change-assurance result consumed by PR/CI integrations. The report distinguishes `DETERMINISTIC`, `OBSERVED`, `INFERRED`, and `UNKNOWN` provenance and carries an advisory PASS/REVIEW/BLOCK decision. It does not replace repository merge authority or Intent Evidence Authority evidence authority.


## OakSpec 1.0 (preview)

The `@ruleoak/protocol/oakspec` subpath defines the RuleOak-authored OakSpec 1.0 interoperability profile and candidate-bundle validation. External standard/adoption status is not claimed.

## Experimental family contract

The additive `@ruleoak/protocol/family` entrypoint provides exact release and typed evidence contracts. See the source distribution document `docs/family-contract.md`. Integrity, human review, semantic support, workload qualification and effect confirmation remain independent; evidence never transfers execution authority.
