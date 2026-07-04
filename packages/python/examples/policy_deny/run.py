from ruleoak_py import create_action_envelope, evaluate_policy

action = create_action_envelope("filesystem.delete", target="/protected", arguments={"path": "/protected"})
print(evaluate_policy(action, {"blockedActions": ["filesystem.delete"]}))
