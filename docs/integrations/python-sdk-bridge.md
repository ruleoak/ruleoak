# Python SDK Compatibility Bridge

This RuleOak Core v2.1.0 release adds a Core-side bridge for `ruleoak-py` v0.3 records.

The bridge keeps the stable RuleOak Governance Protocol v1 contract:

```text
ruleoak.governance.v1
```

Python apps may emit either direct Core-shaped records or Python SDK envelopes such as:

```json
{
  "protocol": "ruleoak.governance.v1",
  "kind": "RunRecord",
  "record": {
    "run_id": "py-run-001",
    "domain": "example",
    "workflow": "governed-tool-call",
    "actor": "python-local-user",
    "status": "running",
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "sdk": "ruleoak-py",
  "sdk_version": "0.3.0"
}
```

Core normalizes the envelope into the canonical Core record shape, validates it against Governance Protocol v1, and writes a local bridge report.

## Commands

```bash
npm run python:bridge
npm run test:python-bridge
```

## What the bridge validates

- protocol value is `ruleoak.governance.v1`
- Python `kind` maps to a supported Governance Protocol v1 record type
- snake_case SDK fields normalize into canonical Core field names
- records pass Core schema validation
- evidence records receive deterministic hashes when the Python envelope omits one
- bridge report is written locally

## Boundary

The bridge does not execute Python code, call a Python package manager, or require network access. It validates records emitted by Python apps and SDK examples.
