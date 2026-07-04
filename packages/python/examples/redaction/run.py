from ruleoak_py import redact
print(redact({"apiKey":"secret","nested":{"token":"abc"}}))
