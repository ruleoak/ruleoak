# RuleOak Compatibility Matrix

This matrix separates **public GitHub releases** from **RuleOak Core v2.1.0**.

## Latest public version

- Latest public Core release: `v2.1.0`
- Earlier public baseline: `v1.0.1`
- Governance protocol: `ruleoak.governance.v1`
- Protocol conformance command: `npm run protocol:conformance`
- Python SDK conformance command: `npm run protocol:python`

## Package metadata in this archive

This package carries RuleOak Core v2.1.0 public release metadata, tests, and compatibility scripts. Future major releases should preserve Governance Protocol v1 compatibility unless a protocol v2 is explicitly introduced.

## Compatibility commitment

RuleOak Core v2.1.0 and RuleOak Core v2.1.0 treat `ruleoak.governance.v1` as the stable record contract unless a breaking change is explicitly documented.

This means compatible releases and snapshots should continue to validate the same core record families:

- RunRecord
- EvidenceRecord
- ApprovalRecord
- AuditEvent
- PolicyDecisionRecord
- ReportRecord

## Public release line

| Version | Public status | Focus | Compatibility stance |
|---|---|---|---|
| v1.0.1 | Released | Earlier public baseline for governed runtime, sandbox foundation, demos, and reports | Pre-protocol baseline |
| v2.1.0 | Released | Latest public Core release for local-first governance, Tool Guard, MCP-style paths, approval UX, policy packs, evidence, and reports | Protocol v1-compatible direction |

## RuleOak Core v2.1.0 development line

| Version marker | Public status | How to describe it |
|---|---|---|
| future major releases | Unreleased unless published later | Future major release candidate only; not part of the current public release unless explicitly published |

## Safety compatibility

RuleOak keeps these safety boundaries unless a release explicitly says otherwise:

- read-only connectors do not write
- write connector demos remain local dry-run/outbox only
- local telemetry export does not send externally
- local MCP proxy defaults to loopback/local-safe mode
- policy decisions remain outside prompts

## Protocol stability

RuleOak Governance Protocol v1 is the stable record contract for RuleOak Core v2.1.0 and compatible RuleOak Core v2.1.0.

```text
Protocol: ruleoak.governance.v1
Status: stable
Breaking-change path: ruleoak.governance.v2
```

Validate the compatibility surface with:

```bash
npm run protocol:status
npm run protocol:conformance
npm run docs:protocol:lint
npm run compatibility:matrix
```
