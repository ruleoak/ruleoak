# Python SDK Bridge

RuleOak Core v1.0 is the canonical governed AI runtime. The companion Python SDK, `ruleoak-py`, is currently a **private-preview bridge** for Python applications that need RuleOak Core v1.0-compatible governance records and governed LLM calls.

Do not describe `ruleoak-py` as a public stable SDK yet. It is useful for private validation, integration testing, and proving that RuleOak governance can fit Python vertical-app workflows without embedding the TypeScript runtime.

## Use case

Use the Python bridge when an application is already written in Python and needs a clean governance trail around automated work:

- run records
- evidence records
- policy decisions
- approval records
- audit events
- report records
- domain-pack metadata
- governed LLM request/response records
- local-first LLM routing with cloud-disabled-by-default behavior

## Positioning

`ruleoak-py` is a bridge, not a replacement for RuleOak Core.

| Layer | Role |
|---|---|
| RuleOak Core v1.0 | Canonical governed runtime and policy/sandbox foundation |
| ruleoak-py v0.2.1 private preview | Python SDK bridge for RuleOak-compatible governance records and governed LLM calls |
| Vertical app | Performs domain work and calls the SDK at governance boundaries |

## Typical integration pattern

A Python application should call the SDK before and after meaningful actions:

1. Start a governed run.
2. Evaluate policy for the proposed action.
3. Record evidence for the recommendation or action.
4. Request or record approval when needed.
5. Append audit events.
6. Write a report record.
7. For LLM calls, record prompt/response hashes, provider mode, data boundary, policy decision, and approval status.

The application remains responsible for its own domain logic. RuleOak records the governance trail around that work.

## Generic sample

See:

```text
examples/python-bridge/generic_bridge_sample.py
```

The sample writes RuleOak-compatible local records and optionally imports a local RuleOak Core JavaScript runtime if `RULEOAK_CORE_PATH` is set.

```bash
python -m pip install -e ../ruleoak-py
python examples/python-bridge/generic_bridge_sample.py

# Optional local RuleOak Core smoke test
export RULEOAK_CORE_PATH=/path/to/ruleoak-core
python examples/python-bridge/generic_bridge_sample.py
```

The optional smoke test is local only. It does not download packages and does not call the network.

## Release boundary

The SDK version is separate from RuleOak Core:

- RuleOak Core: v1.0 product line
- ruleoak-py: v0.2.1 private preview
- Record compatibility: RuleOak Core v1.0

The SDK should stay private until:

- final license is selected;
- API stability level is clear;
- public README and examples are reviewed;
- no private vertical-app names or internal project details remain;
- PyPI/GitHub publication decision is intentional.

## Public communication

Safe public wording:

> A private-preview Python bridge is being validated for RuleOak Core v1.0-compatible governance records and governed LLM calls from Python vertical applications.

Avoid describing it as a full Python port, a public stable SDK, a sandbox, or a cloud service.
