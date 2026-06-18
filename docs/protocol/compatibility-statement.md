# RuleOak Governance Protocol v1 compatibility statement

RuleOak Core v2.0.1 uses the governance record protocol identifier:

```text
ruleoak.governance.v1
```

The protocol covers the core records used by RuleOak and compatible SDKs:

- run records
- evidence records
- approval records
- audit events
- policy decision records
- report records

## Compatibility intent

RuleOak Core v2.x should keep `ruleoak.governance.v1` records backward-compatible unless a breaking change is explicitly documented.

Compatible changes may include:

- adding optional fields
- adding new record examples
- adding stricter conformance fixtures that do not invalidate existing required fields
- improving documentation

Breaking changes should require either:

- a new protocol identifier, or
- a documented migration path.

## Conformance

Run:

```bash
npm run protocol:conformance
```

This validates golden governance records against the bundled schemas and helps keep TypeScript Core, Python SDKs, adapters, and report exporters aligned.
