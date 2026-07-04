from ruleoak_py.integrations.openai_agents import wrap_tool
def calc(): return 2
print(wrap_tool(calc)())
