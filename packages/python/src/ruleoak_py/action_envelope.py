from __future__ import annotations

from typing import Any, Dict


def create_action_envelope(
    action_type: str,
    target: str | None = None,
    arguments: Dict[str, Any] | None = None,
    metadata: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Create a strict RuleOak protocol action envelope.

    Mirrors @ruleoak/protocol: the envelope uses only canonical protocol fields:
    ``type``, optional ``target``, optional ``arguments``, and optional ``metadata``.
    """
    if not isinstance(action_type, str) or not action_type:
        raise ValueError("action_type must be a non-empty string")
    if target is not None and not isinstance(target, str):
        target = str(target)
    action: Dict[str, Any] = {"type": action_type}
    if target is not None:
        action["target"] = target
    if arguments is not None:
        if not isinstance(arguments, dict):
            raise ValueError("arguments must be a dict when provided")
        action["arguments"] = arguments
    if metadata is not None:
        if not isinstance(metadata, dict):
            raise ValueError("metadata must be a dict when provided")
        action["metadata"] = metadata
    return action
