from ruleoak_py import RuleOakEngine, RuleOakPolicyValidationError, validate_action_envelope, validate_policy

def test_policy_validation_fails_closed():
    assert validate_policy({"defaultAction": "explode"})["valid"] is False
    try:
        RuleOakEngine({"defaultAction": "explode"})
    except RuleOakPolicyValidationError as exc:
        assert "policy.defaultAction is invalid" in ";".join(exc.errors)
    else:
        raise AssertionError("expected invalid policy to raise")

def test_action_validation():
    assert validate_action_envelope({"type": "filesystem.read", "target": "README.md"})["valid"] is True
    assert validate_action_envelope({"target": "README.md"})["valid"] is False
