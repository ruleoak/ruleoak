# ruleoak-py v0.3 Compatibility

This RuleOak Core v2.1.0 release recognizes `ruleoak-py` v0.3 as the current Python SDK compatibility target.

The compatibility boundary is simple:

```text
Python app or SDK -> Governance Protocol v1 record/envelope -> RuleOak Core validation/reporting
```

RuleOak Core does not need to execute Python code. It validates governance records emitted by Python workflows and converts Python SDK envelopes into canonical Core records when needed.

## Supported minimum

```text
ruleoak-py >= 0.3.0
RuleOak Governance Protocol: ruleoak.governance.v1
RuleOak Core line: future major releases
```

## Commands

```bash
npm run protocol:python
npm run python:bridge
npm run test:python-bridge
```

## Developer value

A Python developer can keep their existing app stack, emit governance records locally, and let RuleOak Core validate, report, and audit those records using the same stable protocol as the TypeScript runtime.
