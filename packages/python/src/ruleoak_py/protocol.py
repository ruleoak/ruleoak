from __future__ import annotations

import json
from typing import Any, Dict, List

DECISIONS = ["allow", "deny", "block", "needs_approval", "dry_run_only"]
CANONICAL_DECISIONS = ["allow", "deny", "needs_approval", "dry_run_only"]


def is_object(value: Any) -> bool:
    return isinstance(value, dict)


def normalize_decision_action(value: Any) -> Any:
    return "deny" if value == "block" else value


def validation_result(errors: List[str]) -> Dict[str, Any]:
    ok = len(errors) == 0
    return {"valid": ok, "errors": errors, "isValid": ok, "errorMessage": "; ".join(errors)}


def validate_action_envelope(action: Dict[str, Any] | Any) -> Dict[str, Any]:
    errors: List[str] = []
    if not is_object(action):
        errors.append("action must be an object")
    if is_object(action):
        has_type = isinstance(action.get("type"), str) and len(action.get("type", "")) > 0
        has_action = isinstance(action.get("action"), str) and len(action.get("action", "")) > 0
        if not has_type and not has_action:
            errors.append("action.type is required")
        if "type" in action and not isinstance(action.get("type"), str):
            errors.append("action.type must be a string when present")
        if "action" in action and not isinstance(action.get("action"), str):
            errors.append("action.action must be a string when present")
        if "target" in action and action.get("target") is not None and not isinstance(action.get("target"), str):
            errors.append("action.target must be a string when present")
        if "arguments" in action and not is_object(action.get("arguments")):
            errors.append("action.arguments must be an object when present")
        if "metadata" in action and not is_object(action.get("metadata")):
            errors.append("action.metadata must be an object when present")
    return validation_result(errors)


def validate_policy(policy: Dict[str, Any] | Any) -> Dict[str, Any]:
    errors: List[str] = []
    if not is_object(policy):
        errors.append("policy must be an object")
    if is_object(policy):
        valid_defaults = ["allow", "deny", "block", "needs_approval", "dry_run_only"]
        if "defaultAction" in policy and policy.get("defaultAction") not in valid_defaults:
            errors.append("policy.defaultAction is invalid")
        for key in ["allowedActions", "approvalRequired", "blockedActions"]:
            if key in policy:
                value = policy.get(key)
                if not isinstance(value, list) or any(not isinstance(x, str) or len(x) == 0 for x in value):
                    errors.append(f"policy.{key} must be an array of non-empty strings")
    return validation_result(errors)


validate_policy_structure = validate_policy


def validate_protocol_evidence_event(event: Dict[str, Any] | Any) -> Dict[str, Any]:
    errors: List[str] = []
    if not is_object(event):
        errors.append("event must be an object")
    if is_object(event):
        index = event.get("index")
        if not isinstance(index, int) or index < 1:
            errors.append("event.index must be a positive integer")
        if not isinstance(event.get("timestamp"), str):
            errors.append("event.timestamp is required")
        action_validation = validate_action_envelope(event.get("action"))
        if not action_validation["valid"]:
            errors.extend([f"event.action.{e}" for e in action_validation["errors"]])
        decision = event.get("decision")
        if not is_object(decision) or decision.get("action") not in DECISIONS:
            errors.append("event.decision.action is invalid")
        if not isinstance(event.get("previousHash"), str):
            errors.append("event.previousHash is required")
        if not isinstance(event.get("hash"), str):
            errors.append("event.hash is required")
    return validation_result(errors)


validate_evidence_event = validate_protocol_evidence_event


def load_json_lines(text: str) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for i, line in enumerate([ln for ln in text.splitlines() if ln.strip()], start=1):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL line {i}: {exc}") from exc
    return events
