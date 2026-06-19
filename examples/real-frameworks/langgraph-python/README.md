# LangGraph real-framework-ready example

Run:

```bash
npm run adapter:langgraph:real
```

This example detects whether `langgraph` is installed. If it is installed, the file exposes the same `ruleoak_guarded_node` function you would place around a real LangGraph node or tool. If it is not installed, the example still runs and emits the same governance decision flow for CI and first-time users.

The important boundary is:

```text
LangGraph node/tool input -> RuleOak policy decision -> execute, pause, or block
```
