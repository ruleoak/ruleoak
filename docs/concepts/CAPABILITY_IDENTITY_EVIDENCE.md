# Capability Identity & Evidence

RuleOak v0.50.0 separates **what a capability is** from **how RuleOak learned about it**.

## CapabilityIdentity v1

A capability identity contains a stable integration identifier and a stable capability identifier. The identifiers deliberately exclude package/version numbers and observation timestamps so an ordinary version upgrade with the same logical action does not become a new capability.

A tool/action rename is intentionally treated as a new capability identity. RuleOak reports that as removal plus addition rather than silently guessing that two names are equivalent.

Identity basis is explicit:

- `explicit` — caller supplied a durable identity key;
- `package-identifier` — a stable package identifier was available;
- `source-anchor` — a safe remote URL anchor was available; credentials, query and fragment are excluded;
- `name-transport` — fallback when no stronger stable anchor exists.

Only digests of identity anchors are retained in capability IDs. Raw local paths are not embedded in the identity contract.

## CapabilityEvidence v1

Capability evidence records how a capability observation was obtained. Evidence classes are:

- `registry_metadata`
- `declared_manifest`
- `runtime_discovery`
- `local_package_evidence`
- `inferred_classification`
- `operator_annotation`
- `historical_observation`

A single observation can carry more than one class, for example runtime discovery plus inferred classification. `inferred_classification` also covers RuleOak-derived classification components such as deriving a read-only consequence from a declared read-only state; this prevents a partly derived classification from being presented as wholly declared.

Evidence includes source kind, source digest when available, declared/protocol versions, mutability, classification basis and observation time. It intentionally does not contain a raw source locator.

## Capability Manifest v1.2

Manifest v1.2 adds:

- `identity.integration_id`
- `identity.identity_basis`
- per-tool `capability_id`
- per-tool `capability_identity`
- per-tool `evidence`

The manifest `fingerprint` is now a capability-surface fingerprint. It excludes observation time, source digest, package version, descriptions and other volatile metadata. It still includes capability identity, state/consequence, schema digest, classification basis, transport and protocol version.

This means two scans of the same logical surface can have different evidence observations while retaining the same capability-surface fingerprint.

## Migration

`migrateCapabilityManifestToV12()` converts v1.0/v1.1 manifests into v1.2. If the legacy manifest did not record an observation time, the migrated evidence records `observed_at: null` rather than inventing a timestamp.

For long-lived integrations, callers should provide an explicit durable identity key when available.

## Evidence is not authority

Capability identity/evidence does not grant permission. Registry metadata, runtime discovery and advisory intelligence remain inputs to inspection and policy reasoning; they do not themselves create an Authority Envelope, approval or ExecutionLease.
