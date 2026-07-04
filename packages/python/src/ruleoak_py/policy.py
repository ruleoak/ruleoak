from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from .core import matches_pattern as pattern_matches_action, pattern_specificity
from .protocol import normalize_decision_action


def load_policy(path_or_policy: str | Path | Dict[str, Any] | None = None) -> Dict[str, Any]:
    if path_or_policy is None:
        return {"defaultAction": "needs_approval", "allowedActions": [], "approvalRequired": [], "blockedActions": []}
    if isinstance(path_or_policy, dict):
        return path_or_policy
    text = Path(path_or_policy).read_text(encoding="utf-8")
    return json.loads(text)


def normalize_policy_decision(decision: str | None = "needs_approval") -> str:
    value = normalize_decision_action(decision or "needs_approval")
    return value if value in {"allow", "deny", "needs_approval", "dry_run_only"} else "deny"


def matching_patterns(patterns: List[str] | None, key: str) -> List[Dict[str, Any]]:
    matches = [
        {"pattern": p, "specificity": pattern_specificity(p)}
        for p in (patterns or [])
        if pattern_matches_action(p, key)
    ]
    return sorted(matches, key=lambda x: (-x["specificity"], str(x["pattern"])))
