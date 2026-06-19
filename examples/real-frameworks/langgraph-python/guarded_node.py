#!/usr/bin/env python3
"""RuleOak v2.1.0 LangGraph real-framework-ready example.

The example is intentionally runnable without LangGraph installed. When LangGraph is
available, the same guarded function can be used as a node/tool wrapper. The point is
not to replace LangGraph; the point is to put RuleOak before node/tool execution.
"""
import importlib.util
import json
from datetime import datetime, timezone
from uuid import uuid4

HAS_LANGGRAPH = importlib.util.find_spec("langgraph") is not None

TOOLS = {
    "search_docs": {"risk": "low", "effect": "allow"},
    "write_repository_file": {"risk": "medium", "effect": "approval_required"},
    "delete_workspace_file": {"risk": "high", "effect": "deny"},
}

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def decide(action: str):
    spec = TOOLS.get(action, {"risk": "unknown", "effect": "approval_required"})
    effect = spec["effect"]
    reason = {
        "allow": "read-only LangGraph tool action allowed before execution",
        "approval_required": "repository write requires human approval before LangGraph execution",
        "deny": "destructive workspace action blocked before LangGraph execution",
    }.get(effect, "unknown action requires review")
    return {"effect": effect, "risk": spec["risk"], "reason": reason}

def governance_record(action: str, subject: str):
    decision = decide(action)
    return {
        "schema": "ruleoak.governance.v1",
        "recordType": "PolicyDecisionRecord",
        "recordId": f"decision-{uuid4()}",
        "runId": f"roak-langgraph-real-{uuid4()}",
        "action": action,
        "subject": subject,
        "effect": decision["effect"],
        "reason": decision["reason"],
        "createdAt": utc_now(),
        "metadata": {
            "ruleoakCoreRelease": "2.1.0",
            "adapter": "langgraph-python-real-framework-ready",
            "frameworkInstalled": HAS_LANGGRAPH,
            "boundary": "RuleOak policy decision is evaluated before LangGraph node/tool execution",
        },
    }

def ruleoak_guarded_node(state):
    action = state.get("action", "search_docs")
    record = governance_record(action, f"langgraph-node:{action}")
    if record["effect"] != "allow":
        return {"executed": False, "ruleoak": record, "result": None}
    return {"executed": True, "ruleoak": record, "result": {"documents": ["adapter boundary confirmed"]}}

if __name__ == "__main__":
    scenarios = [
        ruleoak_guarded_node({"action": "search_docs"}),
        ruleoak_guarded_node({"action": "write_repository_file"}),
        ruleoak_guarded_node({"action": "delete_workspace_file"}),
    ]
    summary = {
        "ok": True,
        "adapter": "langgraph-python",
        "ruleoakCoreRelease": "2.1.0",
        "langgraphInstalled": HAS_LANGGRAPH,
        "mode": "real-framework-ready" if HAS_LANGGRAPH else "optional-dependency-dry-run",
        "summary": {
            "allowed": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "allow"),
            "approvalRequired": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "approval_required"),
            "denied": sum(1 for s in scenarios if s["ruleoak"]["effect"] == "deny"),
            "executed": sum(1 for s in scenarios if s["executed"]),
        },
        "scenarios": scenarios,
    }
    print(json.dumps(summary, indent=2))
