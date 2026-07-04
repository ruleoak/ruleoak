from __future__ import annotations
from typing import Any, Callable, Dict
from ruleoak_py.integrations.generic import wrap_tool as _wrap


def wrap_tool(
    tool: Callable[..., Any],
    recorder=None,
    action_type: str | None = None,
    dry_run: bool = False,
    policy: Dict[str, Any] | None = None,
    approval_callback=None,
):
    resolved_action_type = action_type or f"{getattr(tool, '__name__', 'tool')}.call"
    if dry_run:
        policy = policy or {"defaultAction": "needs_approval", "approvalRequired": [resolved_action_type]}
    guarded = _wrap(
        tool,
        recorder=recorder,
        action_type=resolved_action_type,
        policy=policy or {"defaultAction": "allow"},
        approval_callback=approval_callback,
    )

    def wrapped(*args: Any, **kwargs: Any):
        result = guarded(*args, **kwargs)
        return result["result"] if isinstance(result, dict) and result.get("executed") else result

    wrapped.ruleoak_recorder = guarded.ruleoak_recorder
    return wrapped
