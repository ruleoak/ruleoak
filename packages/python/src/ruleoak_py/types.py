from __future__ import annotations
from typing import Any, Dict, Literal
RuleOakDecision = Literal["allow", "deny", "needs_approval", "dry_run_only"]
ActionEnvelope = Dict[str, Any]
