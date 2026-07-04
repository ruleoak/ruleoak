from ruleoak_py import redact, redact_value

def test_redaction():
    assert redact({"apiKey":"x"})["apiKey"] == "[REDACTED]"
    assert redact_value({"token":"x"})["token"] == "[REDACTED]"
