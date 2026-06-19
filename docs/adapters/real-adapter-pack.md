# Real adapter pack

RuleOak Core includes a Real Adapter Pack for developers who want to use RuleOak with existing agent stacks instead of replacing them.

## Why this matters

Developers already build with LangGraph, CrewAI, MCP tools, and custom Python/Node workflows. RuleOak should not force a rewrite. The right integration pattern is:

```text
existing framework tool call -> RuleOak policy/evidence/approval/audit -> execute, pause, or block
```

## Included adapters

| Adapter | Command | Dependency stance |
|---|---|---|
| LangGraph Python | `npm run adapter:langgraph:real` | optional `langgraph` package |
| CrewAI Python | `npm run adapter:crewai:real` | optional `crewai` package |
| MCP local JSON-RPC | `npm run adapter:mcp:real` | built-in local demo |

## Boundary

The LangGraph and CrewAI examples are optional-dependency examples. They are designed to show the exact place where RuleOak governance should wrap framework tool execution.

The MCP example starts a local loopback proxy and sends JSON-RPC `tools/call` requests through RuleOak before forwarding safe calls.

## What this proves

RuleOak can add governance without redesigning the application or replacing the orchestration framework.

## Adapter hardening

See `docs/adapters/adapter-hardening.md` for the RuleOak Core v2.1.0 adapter conformance layer, LangGraph/CrewAI wrappers, and MCP local proxy client helper.


## Real framework examples

For the v2.1.0 public developer release, see `docs/adapters/real-framework-examples.md` and `examples/real-frameworks/`. These examples add a coding-agent boundary and provide more explicit LangGraph, CrewAI, and MCP paths for external developers.
