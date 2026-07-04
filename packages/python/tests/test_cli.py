import json, os, subprocess, sys

def _env():
    e=os.environ.copy(); e["PYTHONPATH"] = "src" + os.pathsep + e.get("PYTHONPATH", ""); return e

def test_cli_demo_hash_chain():
    r=subprocess.run([sys.executable,"-m","ruleoak_py.cli","demo","hash-chain"], capture_output=True, text=True, env=_env())
    assert r.returncode == 0, r.stderr
    data=json.loads(r.stdout)
    assert data["verification"]["ok"] is True

def test_cli_demo_approval_required():
    r=subprocess.run([sys.executable,"-m","ruleoak_py.cli","demo","approval-required"], capture_output=True, text=True, env=_env())
    assert r.returncode == 0, r.stderr
    assert "needs_approval" in r.stdout
