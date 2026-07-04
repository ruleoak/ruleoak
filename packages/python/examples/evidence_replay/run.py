from ruleoak_py import EvidenceRecorder, RuleOakEngine, create_action_envelope, replay_jsonl_text
from pathlib import Path

path = Path(".ruleoak-example/evidence.jsonl")
if path.exists():
    path.unlink()
rec = EvidenceRecorder(path)
action = create_action_envelope("filesystem.read", target="README.md")
decision = RuleOakEngine({"allowedActions": ["filesystem.read"]}).evaluate(action)
rec.append(action, decision, "2026-01-01T00:00:00.000Z")
print(replay_jsonl_text(path.read_text()))
