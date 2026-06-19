# Adapter hardening example

This example demonstrates the RuleOak Core v2.1.0 adapter layer:

- LangGraph-style governed node wrapper
- LangGraph-style governed tool spec
- CrewAI-style governed tool wrapper
- local MCP JSON-RPC proxy client/config helper
- adapter conformance report

Run:

```bash
npm run adapter:hardening
```

The output proves that RuleOak evaluates tool calls before framework execution. Allowed calls run, approval-required calls pause, and blocked calls do not execute.
