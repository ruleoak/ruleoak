# RuleOak Governance Protocol Compatibility Statement

RuleOak Governance Protocol v1 is the stable record contract for RuleOak Core v2.x and future major releases.

The protocol identifier remains:

```text
ruleoak.governance.v1
```

This is expected. Product releases and protocol releases are separate compatibility surfaces.

## Compatibility rules

Within protocol v1:

- required fields remain readable
- enum meanings remain stable
- optional fields may be added
- deprecations must be documented
- breaking record-shape changes require protocol v2

## Validation

```bash
npm run protocol:status
npm run protocol:conformance
npm run protocol:python
npm run docs:protocol:lint
```

## Boundary

Protocol v1 is an engineering compatibility contract for governance records. It is not a legal compliance standard and does not certify a workflow.
