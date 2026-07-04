from pathlib import Path
from ruleoak_py.core import EvidenceRecorder
from ruleoak_py.integrations import openai_agents, crewai, autogen, llamaindex, semantic_kernel
from ruleoak_py.integrations.langgraph import ruleoak_guarded_node

def test_optional_wrappers_mock(tmp_path: Path):
    for mod in [openai_agents, crewai, autogen, llamaindex, semantic_kernel]:
        recorder = EvidenceRecorder(tmp_path / f"{mod.__name__.split('.')[-1]}.jsonl")
        wrapped = mod.wrap_tool(lambda x=1: {"x": x}, recorder=recorder, action_type="demo.call")
        assert wrapped()["x"] == 1
        assert recorder.read_events()[0]["action"]["type"] == "demo.call"

def test_langgraph_guarded_node_mock(tmp_path: Path):
    recorder = EvidenceRecorder(tmp_path / "langgraph.jsonl")
    def node(state):
        return {**state, "ok": True}
    wrapped = ruleoak_guarded_node(node, recorder=recorder, node_name="langgraph.node")
    result = wrapped({"x": 1})
    assert result["ok"] is True
    assert recorder.read_events()[0]["action"]["type"] == "langgraph.node"
