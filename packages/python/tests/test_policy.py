from ruleoak_py import RuleOakEngine, create_action_envelope, evaluate_policy
from ruleoak_py.core import matches_pattern, pattern_specificity

def test_policy_precedence_matches_ruleoak_core():
    policy = {
        "defaultAction": "deny",
        "allowedActions": ["filesystem.read", "database.*"],
        "approvalRequired": ["filesystem.*", "database.mutate", "*"],
        "blockedActions": ["shell.run", "filesystem.delete"],
    }
    assert evaluate_policy({"type": "filesystem.read"}, policy)["action"] == "allow"
    assert evaluate_policy({"type": "filesystem.write"}, policy)["action"] == "needs_approval"
    assert evaluate_policy({"type": "filesystem.delete"}, policy)["action"] == "deny"
    assert evaluate_policy({"type": "database.read"}, policy)["action"] == "allow"
    assert evaluate_policy({"type": "database.mutate"}, policy)["action"] == "needs_approval"
    assert evaluate_policy({"action": "filesystem.read"}, policy)["action"] == "allow"
    assert RuleOakEngine({"defaultAction": "block"}).evaluate({"type": "unknown.action"})["action"] == "deny"

def test_strict_no_legacy_toolname_operation_fallback():
    result = evaluate_policy({"toolName": "filesystem", "operation": "read"}, {"allowedActions": ["filesystem.read"], "defaultAction": "deny"})
    assert result["action"] == "deny"
    assert "invalid action" in result["reason"]

def test_patterns():
    assert matches_pattern("filesystem.*", "filesystem.read")
    assert pattern_specificity("filesystem.read") > pattern_specificity("filesystem.*") > pattern_specificity("*")
