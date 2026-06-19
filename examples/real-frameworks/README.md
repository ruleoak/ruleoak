# Real framework examples

RuleOak Core v2.1.0 includes real-framework-ready examples for developers who already use LangGraph, CrewAI, MCP-style tools, or coding-agent loops.

These examples are intentionally external-developer focused:

- they do not require you to replace the agent framework;
- they place RuleOak at the tool-call boundary;
- they return allow / approval-required / blocked decisions before execution;
- they generate governance records or adapter-conformance output that can be audited later;
- they keep optional framework dependencies optional so CI and first-time users can run the examples without large installs.

## Run everything

```bash
npm run adapter:real:all
npm run adapter:real:check
```

## Examples

| Example | Command | What it proves |
|---|---|---|
| LangGraph Python | `npm run adapter:langgraph:real` | RuleOak can wrap a LangGraph node/tool boundary before execution. |
| CrewAI Python | `npm run adapter:crewai:real` | RuleOak can pause external-action tools for approval before CrewAI runs them. |
| MCP local proxy | `npm run adapter:mcp:real` | RuleOak can govern JSON-RPC `tools/call` traffic through a local MCP-style proxy. |
| Coding agent boundary | `npm run adapter:coding-agent:real` | RuleOak can allow safe reads, pause risky writes, and block destructive shell/file actions. |

## Optional dependencies

The Python examples include `requirements-optional.txt` files. Install them only if you want to run against the actual framework package:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r examples/real-frameworks/langgraph-python/requirements-optional.txt
pip install -r examples/real-frameworks/crewai-python/requirements-optional.txt
```

Without those packages, the examples still run in dry-run mode and show the same RuleOak governance boundary.
