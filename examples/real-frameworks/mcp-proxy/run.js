#!/usr/bin/env node
import { McpGuardProxyServer } from "../../../src/guard/mcp-proxy-server.js";

const manifest = {
  name: "ruleoak-v2.1.0-real-mcp-proxy-example",
  version: "2.1.0",
  tools: [
    { name: "search_docs", description: "Read local documentation", risk: "low" },
    { name: "send_external_message", description: "Send a message outside the workspace", risk: "medium" },
    { name: "delete_workspace_file", description: "Delete a local workspace file", risk: "high" }
  ]
};

const policy = {
  boundary: "local_only",
  allowedTools: ["search_docs"],
  approvalRequired: ["send_external_message"],
  blockedTools: ["delete_workspace_file"]
};

const executed = [];
const handler = async (request) => {
  executed.push(request.params.name);
  return { ok: true, handledBy: "real-framework-local-mcp-handler", tool: request.params.name };
};

const server = new McpGuardProxyServer({ manifest, policy, serverHandler: handler, host: "127.0.0.1", port: 0 });
const address = await server.start();

async function rpc(id, name) {
  const response = await fetch(`${address.url}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } })
  });
  return response.json();
}

const calls = [await rpc(1, "search_docs"), await rpc(2, "send_external_message"), await rpc(3, "delete_workspace_file")];
const report = server.report({ title: "RuleOak v2.1.0 real MCP proxy example" });
await server.stop();

console.log(JSON.stringify({
  ok: true,
  adapter: "mcp-local-jsonrpc",
  ruleoakCoreRelease: "2.1.0",
  address,
  executed,
  calls,
  summary: report.mcpProxy,
  boundary: "JSON-RPC tools/call traffic is evaluated by RuleOak before handler execution."
}, null, 2));
