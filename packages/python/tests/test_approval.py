from ruleoak_py.approval import auto_allow, auto_deny

def test_approval_callbacks_return_decision_action_shape():
    assert auto_allow({})["action"] == "allow"
    assert auto_deny({})["action"] == "deny"
