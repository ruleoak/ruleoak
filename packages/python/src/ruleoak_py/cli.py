from __future__ import annotations

import argparse
import json
from pathlib import Path

from .agentic import validate_evidence_jsonl_text
from .action_envelope import create_action_envelope
from .core import EvidenceRecorder, RuleOakEngine, default_policy, evaluate_policy, verify_evidence
from .policy import load_policy
from .protocol import validate_action_envelope, validate_policy
from .redaction import redact
from .replay import replay_jsonl


def _read_json(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="ruleoak-py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    val = sub.add_parser("validate-evidence")
    val.add_argument("path")
    verify = sub.add_parser("verify-evidence")
    verify.add_argument("path")
    va = sub.add_parser("validate-action")
    va.add_argument("path")
    vp = sub.add_parser("validate-policy")
    vp.add_argument("path")
    dp = sub.add_parser("default-policy")
    dp.add_argument("--project-root", default=None)
    sub.add_parser("quickstart")
    replay = sub.add_parser("replay")
    replay.add_argument("path")
    evalp = sub.add_parser("evaluate-action")
    evalp.add_argument("path")
    evalp.add_argument("--policy")
    red = sub.add_parser("redact")
    red.add_argument("path")
    demo = sub.add_parser("demo")
    demo.add_argument("name", choices=["approval-required", "policy-deny", "hash-chain"])
    args = parser.parse_args(argv)

    if args.cmd == "quickstart":
        path = Path(".ruleoak-py-demo/evidence.jsonl")
        if path.exists():
            path.unlink()
        recorder = EvidenceRecorder(path)
        action = create_action_envelope(
            "filesystem.delete",
            target="../secret.env",
            arguments={"target": "../secret.env"},
            metadata={"adapter": "ruleoak-py", "demo": "quickstart"},
        )
        decision = RuleOakEngine(default_policy()).evaluate(action)
        event = recorder.append(action, decision, "2026-01-01T00:00:00.000Z")
        print(json.dumps({"event": event, "verification": verify_evidence(recorder.read_events())}, indent=2))
        return 0

    if args.cmd == "validate-evidence":
        result = validate_evidence_jsonl_text(Path(args.path).read_text(encoding="utf-8"))
        print(json.dumps(result, indent=2))
        return 0 if result["ok"] else 1

    if args.cmd == "verify-evidence":
        events = [json.loads(line) for line in Path(args.path).read_text(encoding="utf-8").splitlines() if line.strip()]
        result = verify_evidence(events)
        print(json.dumps(result, indent=2))
        return 0 if result["ok"] else 1

    if args.cmd == "validate-action":
        result = validate_action_envelope(_read_json(args.path))
        print(json.dumps(result, indent=2))
        return 0 if result["valid"] else 1

    if args.cmd == "validate-policy":
        result = validate_policy(_read_json(args.path))
        print(json.dumps(result, indent=2))
        return 0 if result["valid"] else 1

    if args.cmd == "default-policy":
        print(json.dumps(default_policy(args.project_root), indent=2))
        return 0

    if args.cmd == "replay":
        print(json.dumps(replay_jsonl(args.path), indent=2))
        return 0

    if args.cmd == "evaluate-action":
        action = _read_json(args.path)
        policy = load_policy(args.policy) if args.policy else {"defaultAction": "needs_approval"}
        print(json.dumps(evaluate_policy(action, policy), indent=2))
        return 0

    if args.cmd == "redact":
        print(json.dumps(redact(_read_json(args.path)), indent=2))
        return 0

    if args.cmd == "demo":
        if args.name == "hash-chain":
            path = Path(".ruleoak-py-demo/evidence.jsonl")
            if path.exists():
                path.unlink()
            rec = EvidenceRecorder(path)
            action = create_action_envelope(
                "filesystem.delete",
                target="../secret.env",
                arguments={"target": "../secret.env"},
                metadata={"adapter": "ruleoak-py", "demo": "hash-chain"},
            )
            decision = RuleOakEngine({"blockedActions": ["filesystem.delete"]}).evaluate(action)
            rec.append(action, decision, "2026-01-01T00:00:00.000Z")
            result = verify_evidence(rec.read_events())
            print(json.dumps({"evidencePath": str(path), "verification": result}, indent=2))
            return 0 if result["ok"] else 1
        if args.name == "approval-required":
            action = create_action_envelope("email.send", target="outside@example.com", arguments={"to": "outside@example.com"})
        else:
            action = create_action_envelope("filesystem.delete", target="/protected", arguments={"path": "/protected"})
        policy = {"defaultAction": "deny", "approvalRequired": ["email.send"], "blockedActions": ["filesystem.delete"]}
        print(json.dumps(evaluate_policy(action, policy), indent=2))
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
