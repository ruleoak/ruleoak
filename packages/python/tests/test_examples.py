import os, subprocess, sys

def _env():
    e=os.environ.copy(); e["PYTHONPATH"] = "src" + os.pathsep + e.get("PYTHONPATH", ""); return e

def test_examples_run():
    for path in ["examples/generic_tool_wrapper/run.py", "examples/policy_deny/run.py", "examples/redaction/run.py", "examples/evidence_replay/run.py"]:
        r=subprocess.run([sys.executable, path], capture_output=True, text=True, env=_env())
        assert r.returncode == 0, r.stderr
