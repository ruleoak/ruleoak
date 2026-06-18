# RuleOak Governance Record Protocol v1

RuleOak Core v1.6 introduces the Governance Record Protocol: a stable, local-first record format for runs, evidence, approvals, audit events, policy decisions, and reports.

The goal is interoperability. TypeScript Core, the private-preview Python bridge, and future adapters can emit the same governance record shapes.

## Common fields

Every protocol record uses:

```json
{
  "schemaVersion": "ruleoak.governance.v1",
  "recordType": "RunRecord"
}
```

## Record types

- `RunRecord`
- `EvidenceRecord`
- `ApprovalRecord`
- `AuditEvent`
- `PolicyDecisionRecord`
- `ReportRecord`

## Conformance

Run:

```bash
npm run protocol:conformance
npm run test:protocol
```

The conformance kit validates golden records under `tests/conformance/golden-records/` against the required RuleOak fields.

## Boundary

This protocol is an early compatibility contract. It is not a legal compliance standard and does not certify any workflow.
