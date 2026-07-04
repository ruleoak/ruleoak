from __future__ import annotations
from pathlib import Path
from typing import Any, Callable, Dict

from ruleoak_py.action_envelope import create_action_envelope
from ruleoak_py.core import EvidenceRecorder, evaluate_policy
from ruleoak_py.redaction import redact


def _default_recorder() -> EvidenceRecorder:
    return EvidenceRecorder(Path(".ruleoak") / "evidence.jsonl")


def wrap_tool(
    tool: Callable[..., Any],
    recorder: EvidenceRecorder | None = None,
    action_type: str | None = None,
    policy: Dict[str, Any] | None = None,
    approval_callback: Callable[[Dict[str, Any]], Dict[str, Any]] | None = None,
):
    recorder = recorder or _default_recorder()
    name = action_type or getattr(tool, "__name__", "tool")
    if "." not in name:
        name = f"{name}.call"

    def wrapped(*args: Any, **kwargs: Any):
        action = create_action_envelope(
            name,
            arguments={"args": list(args), "kwargs": redact(kwargs)},
            metadata={"adapter": "ruleoak-py", "integration": "generic"},
        )
        decision = evaluate_policy(action, policy or {"defaultAction": "allow"})
        if decision["action"] == "needs_approval" and approval_callback:
            approval = approval_callback({"action": action, "decision": decision})
            approved = approval.get("action") == "allow"
            decision = {**decision, "action": "allow" if approved else "deny", "approval": approval}
        recorder.append(action, decision)
        if decision["action"] != "allow":
            return {"executed": False, "decision": decision}
        result = tool(*args, **kwargs)
        return {"executed": True, "decision": decision, "result": result}

    wrapped.ruleoak_recorder = recorder
    return wrapped
