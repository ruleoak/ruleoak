from __future__ import annotations
from pathlib import Path
from typing import Any, Callable, Dict

from ruleoak_py.core import EvidenceRecorder
from ruleoak_py.integrations.generic import wrap_tool


def ruleoak_guarded_node(
    node: Callable[..., Any],
    recorder: EvidenceRecorder | None = None,
    node_name: str = "langgraph_node.node",
    policy: Dict[str, Any] | None = None,
    approval_callback=None,
):
    action_type = node_name if "." in node_name else f"{node_name}.node"
    guarded = wrap_tool(
        lambda state, *a, **kw: node(state, *a, **kw),
        recorder=recorder,
        action_type=action_type,
        policy=policy or {"defaultAction": "allow"},
        approval_callback=approval_callback,
    )

    def wrapped(state: Dict[str, Any], *args: Any, **kwargs: Any):
        result = guarded(state, *args, **kwargs)
        return result["result"] if isinstance(result, dict) and result.get("executed") else result

    wrapped.ruleoak_recorder = guarded.ruleoak_recorder
    return wrapped


def ruleoak_tool_wrapper(
    tool: Callable[..., Any],
    recorder: EvidenceRecorder | None = None,
    action_type: str | None = None,
    policy: Dict[str, Any] | None = None,
    approval_callback=None,
):
    return wrap_tool(
        tool,
        recorder=recorder,
        action_type=action_type,
        policy=policy or {"defaultAction": "allow"},
        approval_callback=approval_callback,
    )


def ruleoak_checkpoint_evidence(recorder: EvidenceRecorder, path):
    source = Path(recorder.file_path)
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.read_text(encoding="utf-8") if source.exists() else "", encoding="utf-8")
    return path
