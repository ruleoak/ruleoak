from ruleoak_py.integrations.semantic_kernel import wrap_tool
def plugin(): return "ok"
print(wrap_tool(plugin)())
