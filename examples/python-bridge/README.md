# Python Bridge Example

This example shows how a Python application can emit RuleOak Core-compatible governance records through the companion `ruleoak-py` SDK.

It is intentionally generic. It does not depend on a specific vertical app.

## Run

From a workspace that has both repos:

```bash
python -m pip install -e ../ruleoak-py
python examples/python-bridge/generic_bridge_sample.py
```

Optional local RuleOak Core runtime smoke test:

```bash
export RULEOAK_CORE_PATH=/path/to/ruleoak-core
python examples/python-bridge/generic_bridge_sample.py
```

The optional smoke test imports the local RuleOak Core JavaScript runtime. It does not call the network.
