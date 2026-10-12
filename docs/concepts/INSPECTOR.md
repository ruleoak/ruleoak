# Inspector

Inspector answers what authority surface a tool integration exposes. RuleOak v0.50.0 emits Capability Manifest v1.2 with stable CapabilityIdentity v1 identifiers, CapabilityEvidence v1 observations, factual tool classification, deterministic schema fingerprints, provenance, mutability and per-tool classification basis.

## Provenance

- `local-manifest`: can carry a SHA-256 source digest.
- `local-process`: behavior depends on the installed process/version.
- `remote-service`: can change independently of the local RuleOak/package version.

Inspector does not turn these facts into an opaque universal safety score. Declared annotations and inferred classification are kept distinguishable.


See [Capability Identity & Evidence](CAPABILITY_IDENTITY_EVIDENCE.md) for the identity/evidence contract and migration semantics.


Public Capability Index pages preserve the distinction between Registry metadata, Declared, Inspected and Inferred evidence and use stable integration identity rather than display names for canonical URLs.
