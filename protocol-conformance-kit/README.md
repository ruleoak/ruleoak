# RuleOak Protocol Conformance Kit

This kit lets another implementation prove that it can emit, hash, reject, and replay RuleOak governance artifacts consistently.

It is part of the RuleOak Core v2.1.0 release. The latest public RuleOak Core release remains **v2.1.0** and the earlier public baseline remains **v1.0.1**.

## What this kit checks

| Check | Purpose |
|---|---|
| Strict record validation | Rejects malformed `ruleoak.governance.v1` records. |
| Canonical JSON ordering | Ensures hash stability across languages. |
| Canonical record hash | Ensures SDKs produce the same hash for the same record. |
| Evidence bundle replay | Verifies bundled records and bundle hash. |
| Append-only audit-chain replay | Verifies sequence, previous hash, and event hash. |
| Invalid fixture rejection | Ensures implementations fail closed on bad records or tampered replay fixtures. |

## Run the kit in RuleOak Core

```bash
npm run protocol:kit
npm run protocol:kit:json
```

## Use the kit from another SDK

1. Load `conformance-manifest.json`.
2. Validate every file in `fixtures/golden-records/`.
3. Recompute canonical JSON and hashes for `fixtures/hash-tests/`.
4. Verify `fixtures/valid/evidence-bundle.json`.
5. Verify `fixtures/valid/audit-log.json`.
6. Confirm every fixture under `fixtures/invalid-records/` and `fixtures/invalid-bundles/` is rejected.

An SDK should only claim compatibility when all required checks pass.

## Compatibility badges

The badge SVG files are included under `badges/`:

```text
badges/governance-v1-compatible.svg
badges/evidence-bundle-v1-compatible.svg
badges/policy-pack-v1-compatible.svg
```

Use these only when the corresponding conformance checks pass.

## Included fixtures

```text
schemas/                  JSON schemas copied from Core
fixtures/golden-records/  one or more canonical examples per record type
fixtures/valid/           replayable evidence bundle, audit log, envelope, redaction manifest
fixtures/invalid-records/ records that must be rejected
fixtures/invalid-bundles/ tampered replay fixtures that must fail verification
fixtures/hash-tests/      canonical JSON and hash fixtures
badges/                   compatibility badges
```

## Compatibility claim language

Recommended wording:

> Compatible with `ruleoak.governance.v1` using the RuleOak Protocol Conformance Kit.

Avoid saying an implementation is certified, audited, or regulator-approved unless you have separate independent evidence.
