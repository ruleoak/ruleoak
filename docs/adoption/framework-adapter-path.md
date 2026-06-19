# Framework adapter path

RuleOak is framework-adjacent rather than a replacement for agent frameworks.

## LangGraph-style path

Use `wrapLangGraphTool()` or `createLangGraphGovernedNode()` to put RuleOak before a tool or node.

```bash
npm run adoption:real-frameworks
```

## CrewAI-style path

Use `createCrewAiGovernedTool()` to expose an `invoke()` wrapper that evaluates policy before the underlying tool function is executed.

## MCP local-proxy path

Use MCP proxy helpers when a host app or desktop assistant discovers tools through an MCP-like boundary. RuleOak still evaluates the tool call before the downstream server receives it.

## What developers should remember

```text
RuleOak does not replace LangGraph, CrewAI, or MCP.
It adds governance records and approval decisions at their action boundary.
```
