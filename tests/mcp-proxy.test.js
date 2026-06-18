import assert from "node:assert/strict";
import { McpGuardProxy } from "../src/guard/index.js";

const manifest = { server: { name: "test" }, tools: [{ name: "search_docs" }, { name: "send_external_message" }, { name: "delete_workspace_file" }] };
const policy = { allow: ["search_docs"], approvalRequired: ["send_external_message"], block: ["delete_workspace_file"] };
let forwarded = 0;
const proxy = new McpGuardProxy({ manifest, policy, serverHandler: async () => { forwarded++; return { ok: true }; } });
const allowed = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_docs", arguments: {} } });
assert.equal(allowed.result.server.ok, true);
const approval = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "send_external_message", arguments: {} } });
assert.equal(approval.error.code, -32001);
const blocked = await proxy.handleJsonRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "delete_workspace_file", arguments: {} } });
assert.equal(blocked.error.code, -32003);
assert.equal(forwarded, 1);
const report = proxy.report();
assert.equal(report.mcpProxy.forwarded, 1);
assert.equal(report.mcpProxy.approvalRequired, 1);
assert.equal(report.mcpProxy.blocked, 1);
console.log("mcp proxy tests passed");
