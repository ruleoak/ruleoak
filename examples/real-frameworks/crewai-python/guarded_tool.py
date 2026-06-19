#!/usr/bin/env python3
"""RuleOak v2.1.0 CrewAI real-framework-ready example."""
import importlib.util
import json
from datetime import datetime, timezone
from uuid import uuid4

HAS_CREWAI = importlib.util.find_spec("crewai") is not None

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

POLICY = {
    "summarize_ticket": "allow",
    "send_external_message": "approval_required",
    "delete_customer_account": "deny",
}

def decide(action):
    effect = POLICY.get(action, "approval_required")
    return {
        "effect": effect,
        "reason": {
            "allow": "read-only CrewAI support action allowed",
            "approval_required": "external action requires approval before CrewAI tool execution",
            "deny": "irreversible customer action blocked before CrewAI tool execution",
        }.get(effect, "unknown action requires review"),
    }

def guarded_crewai_tool(action, payload=None):
    decision = decide(action)
    record = {
        "schema": "ruleoak.governance.v1",
        "recordType": "PolicyDecisionRecord",
        "recordId": f"decision-{uuid4()}",
        "runId": f"roak-crewai-real-{uuid4()}",
        "action": action,
        "subject": f"crewai-tool:{action}",
        "effect": decision["effect"],
        "reason": decision["reason"],
        "createdAt": utc_now(),
        "metadata": {
            "ruleoakCoreRelease": "2.1.0",
            "adapter": "crewai-python-real-framework-ready",
            "frameworkInstalled": HAS_CREWAI,
            "boundary": "RuleOak policy decision is evaluated before CrewAI tool execution",
        },
    }
    if record["effect"] != "allow":
        return {"executed": False, "ruleoak": record, "result": None}
    return {"executed": True, "ruleoak": record, "result": {"ok": True, "payloadPreview": sorted((payload or {}).keys())}}

if __name__ == "__main__":
    scenarios = [
        guarded_crewai_tool("summarize_ticket", {"ticket": "T-100"}),
        guarded_crewai_tool("send_external_message", {"to": "customer"}),
        guarded_crewai_tool("delete_customer_account", {"account": "A-9"}),
    ]
    print(json.dumps({
        "ok": True,
        "adapter": "crewai-python",
        "ruleoakCoreRelease": "2.1.0",
        "crewaiInstalled": HAS_CREWAI,
        "mode": "real-framework-ready" if HAS_CREWAI else "optional-dependency-dry-run",
        "summary": {
            "allowed": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "allow"),
            "approvalRequired": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "approval_required"),
            "denied": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "deny"),
            "executed": sum(1 for s in scenarios if s["executed"]),
        },
        "scenarios": scenarios,
    }, indent=2))
