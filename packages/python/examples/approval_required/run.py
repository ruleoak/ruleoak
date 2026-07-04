from ruleoak_py import create_action_envelope, evaluate_policy

action = create_action_envelope("email.send", target="outside@example.com", arguments={"to": "outside@example.com"})
print(evaluate_policy(action, {"approvalRequired": ["email.send"]}))
