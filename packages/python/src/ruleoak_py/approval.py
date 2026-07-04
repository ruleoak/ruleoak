from __future__ import annotations
from typing import Any, Dict, Callable


def auto_deny(request: Dict[str, Any]) -> Dict[str, Any]:
    return {"action": "deny", "reason": "auto_deny", "request": request}


def auto_allow(request: Dict[str, Any]) -> Dict[str, Any]:
    return {"action": "allow", "reason": "auto_allow", "request": request}


def create_static_approval(action: str = "deny") -> Callable[[Dict[str, Any]], Dict[str, Any]]:
    return auto_allow if action == "allow" else auto_deny
