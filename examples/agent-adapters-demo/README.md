# RuleOak Agent Adapter Samples

These samples show how RuleOak can wrap existing agent-framework tool calls without replacing the framework.

- `langgraph-sample.js` demonstrates a LangGraph-style function wrapper.
- `crewai-sample.js` demonstrates a CrewAI-style tool object wrapper.

The samples are dependency-free. They do not import LangGraph or CrewAI. They demonstrate the integration boundary that future real adapters can implement.
