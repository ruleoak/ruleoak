from ruleoak_py.integrations.autogen import wrap_tool
def reply(): return "ok"
print(wrap_tool(reply)())
