from ruleoak_py import create_action_envelope, validate_action_envelope

def test_action_envelope_is_strict_protocol_shape():
    action = create_action_envelope("filesystem.delete", target="../secret.env", arguments={"target": "../secret.env"}, metadata={"adapter": "ruleoak-py"})
    assert action == {
        "type": "filesystem.delete",
        "target": "../secret.env",
        "arguments": {"target": "../secret.env"},
        "metadata": {"adapter": "ruleoak-py"},
    }
    assert "toolName" not in action
    assert "operation" not in action
    assert "input" not in action
    assert "risk" not in action
    assert validate_action_envelope(action)["valid"] is True
