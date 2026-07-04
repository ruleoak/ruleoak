from pathlib import Path
from ruleoak_py import EvidenceRecorder, RuleOakEngine, create_action_envelope, read_evidence_jsonl, replay_jsonl_text, validate_evidence_jsonl_text, verify_evidence

def test_hash_chained_evidence_recorder_and_verifier(tmp_path: Path):
    path = tmp_path / "evidence.jsonl"
    recorder = EvidenceRecorder(path)
    action = create_action_envelope("filesystem.delete", target="../secret.env", arguments={"target": "../secret.env"})
    decision = RuleOakEngine({"blockedActions": ["filesystem.delete"]}).evaluate(action)
    event = recorder.append(action, decision, "2026-01-01T00:00:00.000Z")
    assert event["index"] == 1
    assert event["previousHash"] == "GENESIS"
    assert verify_evidence(recorder.read_events())["ok"] is True
    assert validate_evidence_jsonl_text(path.read_text())["ok"] is True
    assert read_evidence_jsonl(path)[0]["action"]["type"] == "filesystem.delete"
    assert replay_jsonl_text(path.read_text())[0]["decision"] == "deny"
    tampered = recorder.read_events()
    tampered[0]["decision"]["reason"] = "changed"
    assert verify_evidence(tampered)["ok"] is False
