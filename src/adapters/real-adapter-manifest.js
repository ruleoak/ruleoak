export function realAdapterManifest() {
  return {
    schema: "ruleoak.real_adapter_pack.v1",
    version: "2.1.0",
    adapters: [
      {
        id: "langgraph-python",
        ecosystem: "python",
        dependency: "langgraph",
        command: "npm run adapter:langgraph:real",
        mode: "optional dependency; real LangGraph path when package is installed",
        governancePattern: "wrap node/tool execution with RuleOak policy decision, evidence, approval, and audit records"
      },
      {
        id: "crewai-python",
        ecosystem: "python",
        dependency: "crewai",
        command: "npm run adapter:crewai:real",
        mode: "optional dependency; real CrewAI path when package is installed",
        governancePattern: "wrap CrewAI tool execution with RuleOak policy decision, evidence, approval, and audit records"
      },
      {
        id: "mcp-local-jsonrpc",
        ecosystem: "node",
        dependency: "built-in local MCP proxy demo",
        command: "npm run adapter:mcp:real",
        mode: "local loopback JSON-RPC client against RuleOak MCP Guard Proxy server",
        governancePattern: "AI client request -> RuleOak proxy -> MCP-style tool handler"
      }
    ]
  };
}
