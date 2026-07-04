from ruleoak_py.integrations.generic import wrap_tool

def add(x, y):
    return x + y

print(wrap_tool(add, action_type="math.add")(1, 2))
