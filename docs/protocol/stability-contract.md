# RuleOak Governance Protocol v1 Stability Contract

RuleOak Governance Protocol v1 is the stable record contract used by RuleOak Core v2.x and future major releases.

The protocol name remains:

```text
ruleoak.governance.v1
```

This is intentional. Product releases can move through RuleOak Core v2.x and future major releases while the governance record protocol remains v1.

## Compatibility promise

Within Governance Protocol v1:

- required fields will not be removed
- existing enum meanings will not be changed
- new optional fields may be added when backward compatible
- deprecated fields remain readable for a documented transition period
- schema validation remains available through the conformance kit
- breaking changes require a new protocol line, such as `ruleoak.governance.v2`

## What Protocol v1 covers

Protocol v1 defines records for:

- `RunRecord`
- `EvidenceRecord`
- `ApprovalRecord`
- `AuditEvent`
- `PolicyDecisionRecord`
- `ReportRecord`

These records allow TypeScript Core, Python SDK fixtures, adapter examples, MCP paths, evidence connectors, approval workflows, and report viewers to exchange a consistent governance record shape.

## Validation commands

```bash
npm run protocol:status
npm run protocol:conformance
npm run protocol:python
npm run docs:protocol:lint
```

## Boundary

Protocol v1 is a stable engineering record contract. It is not a legal compliance standard and does not certify a workflow, control environment, sandbox, or organization.
