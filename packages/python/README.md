# ruleoak-py

Strict Python bridge aligned with the public RuleOak npm packages:

- `@ruleoak/protocol` — action envelope, policy, and evidence validators
- `@ruleoak/core` — policy evaluator and hash-chained evidence recorder
- `@ruleoak/cli` — Node CLI for `init`, `run`, `replay`, and demos

`ruleoak-py` gives Python agents and Python framework adapters the same core governance semantics as RuleOak Core: evaluate before execution, deny or require approval by policy, and write replayable hash-chained evidence.

## Install

```bash
pip install ruleoak-py
```

For the JavaScript CLI/runtime side:

```bash
npm install -g @ruleoak/cli
# or use directly:
npx @ruleoak/cli demo agent-delete
```

## Python quickstart

```python
from ruleoak_py import RuleOakEngine, EvidenceRecorder, create_action_envelope, verify_evidence

policy = {
    "defaultAction": "needs_approval",
    "allowedActions": ["filesystem.read"],
    "approvalRequired": ["filesystem.write", "network.*"],
    "blockedActions": ["filesystem.delete", "shell.run"],
}

action = create_action_envelope(
    "filesystem.delete",
    target="../secret.env",
    arguments={"target": "../secret.env"},
    metadata={"adapter": "ruleoak-py"},
)
decision = RuleOakEngine(policy).evaluate(action)

recorder = EvidenceRecorder(".ruleoak/evidence.jsonl")
recorder.append(action, decision)
print(decision)
print(verify_evidence(recorder.read_events()))
```

## CLI quickstart

```bash
ruleoak-py quickstart
ruleoak-py demo approval-required
ruleoak-py demo hash-chain
ruleoak-py default-policy
ruleoak-py validate-action action.json
ruleoak-py validate-policy policy.json
ruleoak-py verify-evidence .ruleoak-py-demo/evidence.jsonl
```

## Strict API surface

The Python package intentionally uses only the current RuleOak protocol/core shape. There are no old `toolName`, `operation`, `input`, or `risk` action fields, and no old non-hash-chain Python `FlightRecorder` format.

The canonical RuleOak action envelope is:

```json
{
  "type": "filesystem.delete",
  "target": "../secret.env",
  "arguments": { "target": "../secret.env" },
  "metadata": { "adapter": "ruleoak-py" }
}
```

The canonical policy evaluator returns the npm-compatible decision shape:

```json
{
  "action": "deny",
  "reason": "blockedActions always wins: filesystem.delete",
  "matchedPattern": "filesystem.delete",
  "matchedRule": "filesystem.delete",
  "specificity": 2
}
```

Hash-chained evidence events are written by `EvidenceRecorder` and verified by `verify_evidence()`.

## Policy precedence

RuleOak Python follows the same policy precedence as `@ruleoak/core`:

1. `blockedActions` always wins.
2. `allowedActions` and `approvalRequired` are compared by pattern specificity.
3. If allow and approval match with the same specificity, `needs_approval` wins.
4. `defaultAction` applies only when no explicit policy pattern matches.

Pattern specificity matches RuleOak Core: exact patterns are most specific, `prefix.*` is less specific, and `*` is the least-specific catch-all.

## License

Apache-2.0. Copyright 2026 The RuleOak Authors. Contact: hello@ruleoak.com.
