# RuleOak Governance Protocol v1 Hardening

RuleOak Governance Protocol v1 is the stable governance-record contract used by RuleOak Core public releases and RuleOak Core v2.1.0.

Public release wording remains:

- Latest public Core release: **v2.1.0**
- Earlier public baseline: **v1.0.1**
- Anything after v2.1.0 should be described only as unreleased future work until a new GitHub release is published.

## What protocol hardening adds

Protocol hardening turns the protocol from a basic record shape into a stronger compatibility and evidence layer:

1. **Strict root schemas** for RunRecord, EvidenceRecord, PolicyDecisionRecord, ApprovalRecord, AuditEvent, and ReportRecord.
2. **Canonical JSON and hashing** using deterministic key ordering and integrity-field exclusion.
3. **Protocol envelopes** so SDKs and adapters can identify the protocol, kind, emitter, and SDK version.
4. **Append-only audit chains** with sequence, previous hash, and event hash.
5. **Evidence bundles** that package records, record hashes, optional redaction manifests, and a bundle hash.
6. **Replay verification** for evidence bundles and audit chains.
7. **Cross-language conformance** with the Python SDK bridge.

## Protocol boundary

RuleOak Protocol v1 is a governance-record protocol. It does not claim to be an OS sandbox, a cloud compliance certification, or a replacement for enterprise GRC systems. It gives developers a stable way to record:

- what action was proposed;
- what policy decided;
- what evidence was collected;
- who approved or rejected;
- what audit trail was produced;
- whether the record bundle can be replay-verified.

## Developer commands

```bash
npm run protocol:conformance
npm run test:protocol-v1-hardening
npm run protocol:replay examples/protocol-v1-hardening/evidence-bundle.json
```

## Hashing rule

Canonical record hashes are computed from stable JSON after removing integrity fields:

- `hash`
- `recordHash`
- `eventHash`
- `bundleHash`

This lets a verifier recompute a record hash without the hash field changing the payload being hashed.

## Evidence bundle rule

An evidence bundle is valid when:

- every included governance record validates against Protocol v1;
- `recordHashes` exactly match canonical hashes of the included records;
- `bundleHash` matches the canonical bundle payload;
- any redaction manifest uses the same protocol and matching run id;
- duplicate record ids are not present.

## Audit chain rule

An append-only audit chain is valid when:

- each event validates as an `AuditEvent`;
- each event sequence equals its array position;
- each event `previousHash` points to the previous event hash;
- each event `eventHash` recomputes correctly.
