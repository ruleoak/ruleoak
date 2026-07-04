from ruleoak_py.integrations.langgraph import ruleoak_guarded_node
def node(state): return {"ok": state["q"]}
print(ruleoak_guarded_node(node)({"q":"demo"}))
