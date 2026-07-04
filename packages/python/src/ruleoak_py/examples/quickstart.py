from pathlib import Path
from ruleoak_py import EvidenceRecorder, RuleOakEngine, create_action_envelope, verify_evidence

path = Path(".ruleoak-py-demo/evidence.jsonl")
if path.exists():
    path.unlink()
recorder = EvidenceRecorder(path)
action = create_action_envelope("filesystem.delete", target="../secret.env", arguments={"target": "../secret.env"})
decision = RuleOakEngine({"blockedActions": ["filesystem.delete"]}).evaluate(action)
recorder.append(action, decision, "2026-01-01T00:00:00.000Z")
print(verify_evidence(recorder.read_events()))
