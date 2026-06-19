# ruleoak-py protocol conformance

RuleOak Core v2.1.0 includes a conformance target for Python SDK records.

The goal is simple:

```text
Python vertical app → ruleoak-py records → RuleOak governance protocol v1 → RuleOak reports and review
```

`ruleoak-py` remains a separate package. RuleOak Core does not embed Python, execute Python, or require the Python SDK to run.

## What v2.1 validates

The conformance fixtures under `tests/conformance/python-sdk-records/` represent RuleOak-compatible records emitted by a Python integration:

- `RunRecord`
- `PolicyDecisionRecord`
- `EvidenceRecord`
- `ApprovalRecord`
- `AuditEvent`
- `ReportRecord`

Run:

```bash
npm run protocol:python
npm run test:python-sdk
```

Expected result:

```text
All Python SDK fixture records validate against ruleoak.governance.v1
```

## Compatibility target

```text
SDK: ruleoak-py
Minimum target: 0.2.1 SDK preview
Protocol: ruleoak.governance.v1
```

## Boundary

This is a protocol compatibility check. It is not a Python package test runner, not a Python runtime bridge, and not a PyPI release signal.
