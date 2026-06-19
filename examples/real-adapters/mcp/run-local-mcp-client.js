#!/usr/bin/env node
import { McpGuardProxyServer } from "../../../src/guard/mcp-proxy-server.js";

const serverManifest = {
  name: "ruleoak-real-adapter-mcp-demo",
  version: "1.0.0",
  tools: [
    { name: "search_docs", description: "Read local documentation", risk: "low" },
    { name: "send_external_message", description: "Send a message outside the workspace", risk: "medium" },
    { name: "delete_workspace_file", description: "Delete local file", risk: "high" }
  ]
};
const policy = {
  boundary: "local_only",
  allowedTools: ["search_docs"],
  approvalRequired: ["send_external_message"],
  blockedTools: ["delete_workspace_file"]
};
const handler = async (request) => ({ ok: true, handledBy: "local-mcp-demo-handler", tool: request.params.name });
const server = new McpGuardProxyServer({ manifest: serverManifest, policy, serverHandler: handler, host: "127.0.0.1", port: 0 });
const address = await server.start();
const rpc = async (id, name) => {
  const response = await fetch(`${address.url}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } })
  });
  return response.json();
};
const results = [await rpc(1, "search_docs"), await rpc(2, "send_external_message"), await rpc(3, "delete_workspace_file")];
const report = server.report({ title: "Real MCP adapter local client report" });
await server.stop();
console.log(JSON.stringify({ ok: true, adapter: "mcp-local-jsonrpc", address, results, summary: report.mcpProxy }, null, 2));

process.exit(0);
