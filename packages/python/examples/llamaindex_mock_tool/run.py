from ruleoak_py.integrations.llamaindex import wrap_tool
def retrieve(): return ["doc"]
print(wrap_tool(retrieve)())
