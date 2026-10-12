# Family evidence and exact release contracts — experimental 1.0

RuleOak 0.50.0 gains additive `@ruleoak/protocol/family` and `@ruleoak/core/family` entrypoints. Existing root exports, stable API snapshots, policy evaluation, leases and effect semantics are unchanged. These entrypoints are experimental; this does not declare RuleOak 1.0 or publish a new npm release. Use exact archive and package digests to distinguish this source revision.

## Verification vocabulary

| Dimension | What it establishes | What it does not establish |
|---|---|---|
| Integrity `matched` | Canonical envelope and payload digests agree | Producer identity, source-byte authenticity or truth |
| Binding | An authenticated verifier checked evidence against this exact subject and scope | Semantic entailment |
| Semantic support | An authenticated verifier assessed whether evidence supports or contradicts a claim | Universal truth, workload fitness or action authorization |
| Workload qualification | Authenticated evaluation evidence applies to this exact workload scope | All models, other revisions or deployment permission |
| Effect confirmation | A verifier authenticated the relevant observed postcondition evidence | A process exit code alone, authorization or retry safety |
| Human review | A reviewer performed the declared review | Semantic support or organizational approval to execute |

There is deliberately no global `VERIFIED` field. Dimensions are independently `supported`, `contradicted` or `not_established`; unknown producer assertions remain not established. Transport validity can be true while every dimension remains not established.

## Envelope and trust boundary

`sealEvidenceEnvelope` computes SHA-256 over strict, recursively key-sorted JSON encoded as UTF-8. It excludes `envelopeSha256` from its own hash; `payloadSha256` covers the payload. Numbers must be finite and not negative zero. Cycles, getters, hidden properties, exotic objects, lone surrogates, sparse arrays and oversized inputs are rejected. The canonicalization is this contract's algorithm, not a claim of JCS conformance. Native implementations must use the portable corpus and equivalent number serialization before interoperability.

The envelope binds exact producer release/source hash, expected subject hash, scope, versioned payload schema, original/extraction source hashes, timestamps and independent claims. Hash syntax does not prove original source bytes were read. `verifyClaim` must authenticate or independently recompute the referenced evidence, verifier identity, source/extraction bytes, subject and scope. The envelope has no signature implementation and its digest is not an authentication mechanism.

Consumers supply an exact producer allowlist/resolver, expected subject and scope, a Map of supported payload validators, an explicit current revocation snapshot (IDs, checked-at and valid-until), a clock and local verifier callbacks. These are trusted configuration: never load callbacks or trust settings from an imported payload. Fail closed if revocation state is stale/unavailable; offline use is bounded by its validity interval. Exceptions, promises and truthy strings from callbacks are not approvals. Callbacks receive frozen snapshots. Unknown payload versions, extra top-level fields, expired/revoked envelopes and subject/scope substitutions cannot establish dimensions.

`authorityTransferred` is always false. A caller must separately use existing public authorization, policy, lease, revocation and effect APIs. Never convert envelope validity or dimension status into an execution lease, deployment approval or retry decision.

## Release registry and compatibility

`resolveFamilyRelease` requires an exact `{product, releaseId, sourceSha256}` and an independently pinned canonical registry digest. A digest delivered beside an untrusted registry is not a trust anchor. `resolveFamilyDependencySet` resolves the full pinned closure, rejecting cycles and conflicting product revisions. Source archives marked `reference_only` identify a known pin without claiming those source bytes are available.

Package `artifactSha256` is the SHA-256 of the package artifact bytes (npm tarball where applicable), not its version string. Hash the actual artifacts before installation and compare the entire observed set with `verifyFamilyPackageSet`. That function does not inspect an installed filesystem. Install only checked artifacts into a clean directory; mutable post-install trees require independent validation. A package rebuilt from the same source may have a different artifact hash and must not silently substitute for the registered one.

Use `assessFamilyQualification` only with a release returned by the pinned resolver. Qualification evidence must match exact source, platform, kind and validity interval and pass a consumer verifier. Source tests never become native runtime qualification. An empty evidence array means qualification is unestablished.

Compatibility records bind exact consumer/dependency refs, adapter version, platform, test-suite digest, result digest, verifier and validity period. `assessFamilyCompatibility` requires all expected fields and independent evidence verification. Passing tests provides evidence for that tested scope; it does not update a downstream consumer pin or establish untested native support.

Product-specific downstream inventories and adapters can remain outside this public source tree. Private source, credentials, entitlements and customer data must not be copied into the Apache packages.

## Validation

Run `npm install --ignore-scripts --offline --no-audit --no-fund`, then `node packages/core/tests/family.test.js` and `npm test`. The family test is automatically discovered. Portable structural vectors are in `packages/protocol/conformance/family-corpus.json`; JSON Schemas are under `packages/protocol/schemas/family-*`. Schema validation must be followed by runtime semantic, digest and trust checks.

## Authenticated verifier receipts

The additive `@ruleoak/core/family-receipts` API signs and verifies Ed25519
receipts. A receipt binds the envelope identity, exact producer release, subject,
scope, source/extraction hashes, payload, dimension, assertion, evidence digest and
validity interval. Claim lists are excluded from the receipt binding to avoid a
hash cycle; the signed receipt binds the claim itself.

Consumers select an independently provisioned verifier key and allowed dimensions,
then verify actual receipt-evidence bytes. No payload can install a key, verifier,
trust policy or execution permission. Missing keys/evidence, unknown dimensions,
expired receipts, changed payloads and scope substitutions remain untrusted.
The existing envelope revocation/freshness contract still applies. Key rotation
requires replacing the trusted key set; an old key is not implicitly retained.
A review signature establishes the identity of the reviewer assertion; semantic
truth and action authorization remain separate concerns.
