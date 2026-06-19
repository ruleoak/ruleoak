import { McpGuardProxyServer } from "../guard/mcp-proxy-server.js";

export function createMcpClientConfig({ name = "ruleoak-local-mcp-proxy", url = "http://127.0.0.1:0", description = "RuleOak-governed local MCP JSON-RPC proxy" } = {}) {
  return {
    schema: "ruleoak.mcp_client_config.v1",
    name,
    description,
    transport: "http-jsonrpc",
    endpoint: `${url.replace(/\/$/, "")}/rpc`,
    health: `${url.replace(/\/$/, "")}/health`,
    boundary: "local loopback only; RuleOak evaluates tools/call before forwarding",
    clientInstructions: [
      "Point the MCP-capable client to endpoint.",
      "Send JSON-RPC 2.0 tools/call requests only.",
      "Treat error code -32001 as approval required and -32003 as blocked."
    ]
  };
}

export class RuleOakMcpLocalClient {
  constructor({ url }) {
    if (!url) throw new Error("RuleOakMcpLocalClient requires url");
    this.url = url.replace(/\/$/, "");
  }

  async callTool(name, args = {}, id = Date.now()) {
    const response = await fetch(`${this.url}/rpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } })
    });
    return response.json();
  }

  async health() {
    const response = await fetch(`${this.url}/health`);
    return response.json();
  }
}

export async function withRuleOakMcpProxy({ manifest, policy, serverHandler, actor = "mcp-local-adapter", host = "127.0.0.1", port = 0 }, callback) {
  if (typeof callback !== "function") throw new Error("withRuleOakMcpProxy requires callback");
  const server = new McpGuardProxyServer({ manifest, policy, serverHandler, actor, host, port });
  const address = await server.start();
  const client = new RuleOakMcpLocalClient({ url: address.url });
  try {
    return await callback({ server, client, address, config: createMcpClientConfig({ url: address.url }) });
  } finally {
    await server.stop();
  }
}
