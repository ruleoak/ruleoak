from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .protocol import (
    load_json_lines,
    normalize_decision_action,
    validate_action_envelope,
    validate_policy,
    validate_protocol_evidence_event,
)

GENESIS_HASH = "GENESIS"
DECISION = {
    "ALLOW": "allow",
    "DENY": "deny",
    "NEEDS_APPROVAL": "needs_approval",
    "DRY_RUN_ONLY": "dry_run_only",
}


class RuleOakPolicyValidationError(ValueError):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"RuleOak policy validation failed: {'; '.join(errors)}")
        self.errors = errors


def assert_valid_policy(policy: Dict[str, Any]) -> bool:
    validation = validate_policy(policy)
    if not validation["valid"]:
        raise RuleOakPolicyValidationError(validation["errors"])
    return True


def normalize_policy(policy: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    policy = dict(policy or {})
    policy["defaultAction"] = normalize_decision_action(policy.get("defaultAction") or DECISION["NEEDS_APPROVAL"])
    return policy


def action_key(action: Optional[Dict[str, Any]]) -> str:
    if not action:
        return ""
    if isinstance(action.get("type"), str):
        return str(action["type"])
    if isinstance(action.get("action"), str):
        return str(action["action"])
    return ""


def pattern_specificity(pattern: str) -> int:
    if pattern == "*":
        return 0
    if pattern.endswith(".*"):
        return 1
    return 2


def matches_pattern(pattern: str, key: str) -> bool:
    if pattern == "*":
        return True
    if pattern.endswith(".*"):
        return key.startswith(pattern[:-1])
    return pattern == key


def _best_match(patterns: Optional[Iterable[str]], key: str) -> Optional[Dict[str, Any]]:
    best: Optional[Dict[str, Any]] = None
    for pattern in patterns or []:
        pattern = str(pattern)
        if matches_pattern(pattern, key):
            specificity = pattern_specificity(pattern)
            if best is None or specificity > best["specificity"]:
                best = {"pattern": pattern, "specificity": specificity}
    return best


def evaluate_policy(action: Dict[str, Any], raw_policy: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    action_validation = validate_action_envelope(action)
    if not action_validation["valid"]:
        return {
            "action": DECISION["DENY"],
            "reason": f"invalid action: {'; '.join(action_validation['errors'])}",
            "matchedPattern": None,
        }
    raw_policy = raw_policy or {}
    assert_valid_policy(raw_policy)
    policy = normalize_policy(raw_policy)
    key = action_key(action)

    blocked = _best_match(policy.get("blockedActions", []), key)
    if blocked:
        return {
            "action": DECISION["DENY"],
            "reason": f"blockedActions always wins: {blocked['pattern']}",
            "matchedPattern": blocked["pattern"],
            "matchedRule": blocked["pattern"],
            "specificity": blocked["specificity"],
        }

    allowed = _best_match(policy.get("allowedActions", []), key)
    approval = _best_match(policy.get("approvalRequired", []), key)

    if allowed and approval:
        if allowed["specificity"] > approval["specificity"]:
            return {
                "action": DECISION["ALLOW"],
                "reason": f"more-specific allowedActions match: {allowed['pattern']}",
                "matchedPattern": allowed["pattern"],
                "matchedRule": allowed["pattern"],
                "specificity": allowed["specificity"],
            }
        if approval["specificity"] > allowed["specificity"]:
            return {
                "action": DECISION["NEEDS_APPROVAL"],
                "reason": f"more-specific approvalRequired match: {approval['pattern']}",
                "matchedPattern": approval["pattern"],
                "matchedRule": approval["pattern"],
                "specificity": approval["specificity"],
            }
        return {
            "action": DECISION["NEEDS_APPROVAL"],
            "reason": f"same-specificity allow/approval conflict; approval wins safe: {approval['pattern']}",
            "matchedPattern": approval["pattern"],
            "matchedRule": approval["pattern"],
            "specificity": approval["specificity"],
        }

    if allowed:
        return {
            "action": DECISION["ALLOW"],
            "reason": f"matched allowedActions: {allowed['pattern']}",
            "matchedPattern": allowed["pattern"],
            "matchedRule": allowed["pattern"],
            "specificity": allowed["specificity"],
        }
    if approval:
        return {
            "action": DECISION["NEEDS_APPROVAL"],
            "reason": f"matched approvalRequired: {approval['pattern']}",
            "matchedPattern": approval["pattern"],
            "matchedRule": approval["pattern"],
            "specificity": approval["specificity"],
        }

    default_action = policy.get("defaultAction") or DECISION["NEEDS_APPROVAL"]
    return {
        "action": default_action,
        "reason": f"defaultAction: {default_action}; no explicit policy match",
        "matchedPattern": None,
        "matchedRule": "defaultAction",
        "specificity": -1,
    }


class RuleOakEngine:
    def __init__(self, policy: Optional[Dict[str, Any]] = None) -> None:
        policy = policy or {}
        assert_valid_policy(policy)
        self.policy = normalize_policy(policy)

    def evaluate(self, action: Dict[str, Any]) -> Dict[str, Any]:
        return evaluate_policy(action, self.policy)


def stable_stringify(value: Any) -> str:
    if isinstance(value, list):
        return "[" + ",".join(stable_stringify(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(str(k), separators=(",", ":")) + ":" + stable_stringify(value[k]) for k in sorted(value.keys(), key=str)) + "}"
    return json.dumps(value, separators=(",", ":"))


def event_hash(previous_hash: str, event_without_hash: Dict[str, Any]) -> str:
    return hashlib.sha256((previous_hash + stable_stringify(event_without_hash)).encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_decision(decision: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(decision or {})
    if "action" in normalized:
        normalized["action"] = normalize_decision_action(normalized["action"])
    return normalized


class EvidenceRecorder:
    def __init__(self, file_path: str | Path) -> None:
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def read_events(self) -> List[Dict[str, Any]]:
        if not self.file_path.exists():
            return []
        return load_json_lines(self.file_path.read_text(encoding="utf-8"))

    def append(self, action: Dict[str, Any], decision: Dict[str, Any], timestamp: Optional[str] = None) -> Dict[str, Any]:
        events = self.read_events()
        previous_hash = events[-1]["hash"] if events else GENESIS_HASH
        content = {
            "index": len(events) + 1,
            "timestamp": timestamp or _now(),
            "action": action,
            "decision": _normalize_decision(decision),
            "previousHash": previous_hash,
        }
        hash_value = event_hash(previous_hash, content)
        event = {**content, "hash": hash_value}
        validation = validate_protocol_evidence_event(event)
        if not validation["valid"]:
            raise ValueError(f"invalid evidence event: {'; '.join(validation['errors'])}")
        with self.file_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(event, separators=(",", ":")) + "\n")
        return event


class RuleOakFlightRecorder(EvidenceRecorder):
    def write_event(
        self,
        action: Dict[str, Any],
        decision: Dict[str, Any],
        matched_rule: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        enriched = dict(decision or {})
        enriched["matchedRule"] = matched_rule or enriched.get("matchedRule") or enriched.get("matchedPattern") or None
        return self.append(action, enriched, timestamp)


def verify_evidence(events: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    previous_hash = GENESIS_HASH
    errors: List[str] = []
    count = 0
    for idx, event in enumerate(events, start=1):
        count = idx
        validation = validate_protocol_evidence_event(event)
        if not validation["valid"]:
            errors.append(f"line {idx}: {'; '.join(validation['errors'])}")
        if event.get("index") != idx:
            errors.append(f"line {idx}: expected index {idx}, got {event.get('index')}")
        if event.get("previousHash") != previous_hash:
            errors.append(f"line {idx}: previousHash mismatch")
        without_hash = {k: v for k, v in event.items() if k != "hash"}
        expected = event_hash(previous_hash, without_hash)
        if event.get("hash") != expected:
            errors.append(f"line {idx}: hash mismatch")
        previous_hash = event.get("hash")
    return {"ok": len(errors) == 0, "errors": errors, "count": count}


def _is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def classify_filesystem_action(operation: str, target: str | Path, project_root: str | Path | None = None) -> Dict[str, Any]:
    project = Path(project_root or os.getcwd()).resolve()
    abs_target = (project / Path(target)).resolve() if not Path(target).is_absolute() else Path(target).resolve()
    home = Path.home().resolve()
    protected_prefixes = [project / ".git", home / ".ssh"]
    outside_project = not _is_inside(abs_target, project)
    protected_path = any(_is_inside(abs_target, prefix) for prefix in protected_prefixes)
    action_type = "filesystem.read" if operation == "read" else "filesystem.write" if operation == "write" else "filesystem.delete"
    return {
        "type": action_type,
        "target": str(abs_target),
        "metadata": {
            "operation": operation,
            "projectRoot": str(project),
            "outsideProject": outside_project,
            "protectedPath": protected_path,
        },
    }


def default_policy(project_root: str | Path | None = None) -> Dict[str, Any]:
    project = Path(project_root or os.getcwd()).resolve()
    return {
        "defaultAction": "needs_approval",
        "allowedActions": ["filesystem.read"],
        "approvalRequired": ["filesystem.write", "network.*"],
        "blockedActions": ["filesystem.delete", "shell.run"],
        "protectedPaths": [".git", "~/.ssh"],
        "projectRoot": str(project),
    }
