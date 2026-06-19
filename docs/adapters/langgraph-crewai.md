# RuleOak LangGraph and CrewAI Adapter Samples

RuleOak Core v2.1.0 includes dependency-free adapter samples for LangGraph-style and CrewAI-style tool calls.

The goal is not to replace agent frameworks. The goal is to wrap tool execution with RuleOak governance:

1. evaluate policy
2. record evidence
3. pause for approval when required
4. block dangerous calls
5. audit the result

Commands:

```bash
npm run langgraph:demo
npm run crewai:demo
npm run adapter:demo
npm run test:adapters
```

Boundary: these are sample adapters. They do not import LangGraph or CrewAI and do not claim official integration.
