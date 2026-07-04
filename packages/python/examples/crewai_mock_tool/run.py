from ruleoak_py.integrations.crewai import wrap_tool
def task(): return "done"
print(wrap_tool(task)())
