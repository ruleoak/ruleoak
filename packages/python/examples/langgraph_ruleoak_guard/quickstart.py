from ruleoak_py.integrations.langgraph import ruleoak_guarded_node

def node(state):
    return {**state, "ok": True}

print(ruleoak_guarded_node(node, node_name="langgraph.node")({"x": 1}))
