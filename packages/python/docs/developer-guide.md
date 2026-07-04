# Developer guide

Use `RuleOakEngine` / `evaluate_policy()` before executing an action, then use `EvidenceRecorder` to append the canonical hash-chained evidence event.

```python
from ruleoak_py import EvidenceRecorder, RuleOakEngine, create_action_envelope

action = create_action_envelope("filesystem.read", target="README.md")
decision = RuleOakEngine({"allowedActions": ["filesystem.read"]}).evaluate(action)
EvidenceRecorder(".ruleoak/evidence.jsonl").append(action, decision)
```
