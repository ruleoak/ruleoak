import ruleoak_py

def test_no_legacy_exports():
    assert ruleoak_py.__version__ == "2.0.0"
    assert not hasattr(ruleoak_py, "FlightRecorder")
    assert not hasattr(ruleoak_py, "evaluate_action")
    assert not hasattr(ruleoak_py, "infer_risk")
