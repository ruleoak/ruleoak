# RuleOak Protocol Conformance Kit

The Protocol Conformance Kit turns `ruleoak.governance.v1` from an internal record format into a repeatable compatibility target for SDKs, adapters, and vertical applications.

This is RuleOak Core v2.1.0. The latest public RuleOak Core release remains **v2.1.0**.

## Why it matters

A governance protocol is only useful if different implementations produce the same evidence and replay results. The kit provides:

- schemas for governance record types;
- golden records for each record family;
- canonical JSON/hash tests;
- valid evidence-bundle and audit-chain fixtures;
- invalid fixtures that must be rejected;
- compatibility badge assets.

## Commands

```bash
npm run protocol:kit
npm run protocol:kit:json
npm run test:protocol-conformance-kit
```

## Directory

```text
protocol-conformance-kit/
  conformance-manifest.json
  schemas/
  fixtures/
    golden-records/
    valid/
    invalid-records/
    invalid-bundles/
    hash-tests/
  badges/
```

## Required checks

An SDK or adapter should pass all of these before claiming compatibility:

1. Strictly validate golden records.
2. Recompute canonical JSON deterministically.
3. Recompute canonical SHA-256 record hashes.
4. Replay and verify the evidence bundle.
5. Replay and verify the append-only audit chain.
6. Reject malformed records and tampered replay artifacts.

## Badge wording

Recommended public claim:

```text
RuleOak Governance v1 compatible
```

Use this only with a passing conformance report. Do not describe compatibility as certification.
