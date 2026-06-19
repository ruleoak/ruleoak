#!/usr/bin/env python3
"""Optional real LangGraph adapter example for RuleOak.

If LangGraph is installed, this file can be adapted to wrap a real LangGraph node/tool.
If it is not installed, the script still emits a RuleOak-compatible dry-run record so CI
can verify the integration boundary without requiring heavy Python dependencies.
"""
import importlib.util
import json
from datetime import datetime, timezone
from uuid import uuid4

HAS_LANGGRAPH = importlib.util.find_spec("langgraph") is not None

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def policy_decision(action: str):
    if action == "delete_workspace_file":
        return "deny", "destructive filesystem action blocked by RuleOak policy"
    if action == "send_external_message":
        return "approval_required", "external communication requires human approval"
    return "allow", "read-only tool action allowed"

ACTION = "search_docs"
effect, reason = policy_decision(ACTION)
run_id = f"roak-langgraph-{uuid4()}"
record = {
    "schema": "ruleoak.governance.v1",
    "recordType": "PolicyDecisionRecord",
    "recordId": f"decision-{uuid4()}",
    "runId": run_id,
    "action": ACTION,
    "subject": "langgraph-node:search_docs",
    "effect": effect,
    "reason": reason,
    "createdAt": utc_now(),
    "metadata": {
        "adapter": "langgraph-python",
        "langgraphInstalled": HAS_LANGGRAPH,
        "mode": "real-langgraph-ready" if HAS_LANGGRAPH else "dependency-not-installed-dry-run",
        "governanceBoundary": "RuleOak decision is evaluated before node/tool execution"
    }
}
print(json.dumps({"ok": True, "adapter": "langgraph-python", "langgraphInstalled": HAS_LANGGRAPH, "record": record}, indent=2))
