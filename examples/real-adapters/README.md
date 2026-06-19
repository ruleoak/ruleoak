# Real adapter pack

RuleOak Core v2.1.0 includes optional real adapter examples for common agent stacks.

The examples are intentionally lightweight:

- LangGraph example: Python script that detects `langgraph` and emits RuleOak governance records
- CrewAI example: Python script that detects `crewai` and emits RuleOak governance records
- MCP example: local JSON-RPC client against the RuleOak MCP Guard Proxy server

The adapter pack demonstrates how existing frameworks can keep their orchestration while RuleOak governs tool calls before execution.

```bash
npm run adapter:real:list
npm run adapter:langgraph:real
npm run adapter:crewai:real
npm run adapter:mcp:real
```

The LangGraph and CrewAI examples do not require those packages for CI. When installed, the same files provide the integration boundary for a real framework run.
