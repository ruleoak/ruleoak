#!/usr/bin/env python3
"""Optional real CrewAI adapter example for RuleOak.

If CrewAI is installed, this file can be adapted to wrap a real CrewAI tool.
If it is not installed, the script still emits a RuleOak-compatible dry-run record so CI
can verify the integration boundary without requiring heavy Python dependencies.
"""
import importlib.util
import json
from datetime import datetime, timezone
from uuid import uuid4

HAS_CREWAI = importlib.util.find_spec("crewai") is not None

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

action = "send_external_message"
record = {
    "schema": "ruleoak.governance.v1",
    "recordType": "PolicyDecisionRecord",
    "recordId": f"decision-{uuid4()}",
    "runId": f"roak-crewai-{uuid4()}",
    "action": action,
    "subject": "crewai-tool:send_external_message",
    "effect": "approval_required",
    "reason": "external communication requires human approval before CrewAI tool execution",
    "createdAt": utc_now(),
    "metadata": {
        "adapter": "crewai-python",
        "crewaiInstalled": HAS_CREWAI,
        "mode": "real-crewai-ready" if HAS_CREWAI else "dependency-not-installed-dry-run",
        "governanceBoundary": "RuleOak decision is evaluated before CrewAI tool execution"
    }
}
print(json.dumps({"ok": True, "adapter": "crewai-python", "crewaiInstalled": HAS_CREWAI, "record": record}, indent=2))
