from ruleoak_py.sinks import MemorySink

def test_memory_sink():
    s=MemorySink(); s.write({"type":"x"}); assert len(s.list()) == 1
