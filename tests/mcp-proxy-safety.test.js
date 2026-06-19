import assert from "node:assert/strict";
import { McpGuardProxy } from "../src/guard/index.js";

let forwarded = 0;
const proxy = new McpGuardProxy({
  server: { name: "safe-demo", tools: [
    { name: "search_docs", risk: "low" },
    { name: "send_external_message", risk: "medium" },
    { name: "delete_workspace_file", risk: "high" }
  ] },
  policy: {
    allowedTools: ["search_docs"],
    approvalRequired: ["send_external_message"],
    blockedTools: ["delete_workspace_file"]
  },
  serverHandler: async () => { forwarded += 1; return { ok: true }; }
});
const allow = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_docs", arguments: {} } });
assert.ok(allow.result);
const approval = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "send_external_message", arguments: {} } });
assert.equal(approval.error.code, -32001);
const denied = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "delete_workspace_file", arguments: {} } });
assert.equal(denied.error.code, -32003);
const unsupported = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 4, method: "resources/read", params: {} });
assert.equal(unsupported.error.code, -32601);
assert.equal(forwarded, 1, "only allowed tool calls should be forwarded");
const report = proxy.report();
assert.equal(report.mcpProxy.forwarded, 1);
assert.equal(report.mcpProxy.approvalRequired, 1);
assert.equal(report.mcpProxy.blocked, 1);
console.log("mcp-proxy-safety tests passed");
