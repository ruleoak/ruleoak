# RuleOak Public Product Truth — v0.50.0

RuleOak v0.50.0 is a pre-1.0 developer preview of an **open-source Effect Boundary for consequential AI-agent actions**. The first-run product contract is:

```text
exact action intent
→ policy / approval decision
→ one-use ExecutionLease
→ execute once
→ EffectReceipt
→ independent postcondition verification where trusted semantics exist
→ retry disposition
→ tamper-evident evidence
```

A successful transport response is not automatically proof that the intended external effect occurred. A timeout or lost response is not proof that no effect occurred. Unsupported or untrusted effect semantics remain `UNKNOWN`/manual instead of being upgraded into certainty.

## Supported public execution boundaries

The public source contains the Node SDK guarded execution path, managed MCP stdio protection, and MCP Streamable HTTP protection. Full effect verification is available only where a recognized or explicitly reviewed Effect Profile/postcondition is bound to the route. A healthy interception path without trusted effect semantics is `READY_POLICY_ONLY`, not `READY_EFFECT_BOUNDARY`.

The public local operator path includes pending-effect inspection/reconciliation, `protect check`, truthful local `protect value` evidence, capability pin/drift checks, and privacy-minimized evidence. `ruleoak onboard` now reports a bounded activation stage/next action, and `ruleoak feedback snapshot` can write a review-before-share aggregate activation/safety snapshot that excludes project paths, host/user identity, prompts, tool arguments, credentials, raw evidence, and evidence hashes. Reconciliation does not automatically re-dispatch the original action.

## Supporting platform capabilities

Inspector, Flight Control, Flight Recorder, basic CrashLab, policy packs, approvals, authority/revocation primitives, Evidence/Authority Graphs, Git safe execution, capability pin enforcement, public conformance and Extension SPI remain available as supporting authorities. Learning/policy-authoring assistance **does not silently create persistent policy authority**.

## API and protocol maturity

Public API Stability remains in force. Machine-readable maturity levels — `experimental`, `preview`, and `stable` — ship under `@ruleoak/protocol/stability/`. Packages remain pre-1.0 preview; selected already-published protocol contracts and Extension SPI versions retain their declared compatibility commitments. Stable labels are compatibility commitments, not security certification or production-fitness claims.

Public Protocol Conformance remains intact with eleven contract families, valid/invalid vectors, canonical examples, version matrix and SHA-256-pinned manifest. MCP compatibility includes the current RuleOak 2026-07-28 path plus the documented older compatibility path where implemented.

## Public security and release truth

All current first-party public code is Apache-2.0. Release-candidate tooling produces package tarballs, checksums, a deterministic CycloneDX SBOM, an attestation-ready manifest, and a deterministic publish plan that separates brand-new-package trusted OIDC publication from later staged publication with human approval. Standards material is a transparent implementation crosswalk, not certification. Hosted repository settings, real public artifact attestations, external scorecards and independent reviews must be verified on the actual fresh GitHub repository before they can be claimed.

RuleOak remains local-first. No hosted RuleOak account or cloud authorization service is required for the open-source path. It governs only supported actions that cross a RuleOak-controlled or cooperating application-layer boundary; it is not an operating-system sandbox, EDR, universal prompt-injection prevention system, or compliance certification.

**RuleOak 1.0 is not declared by v0.50.0.** A future 1.0 remains gated by meaningful independent adoption, security review/remediation, protocol stability across external integrations, and real operational experience.
