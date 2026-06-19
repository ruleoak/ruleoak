import assert from "node:assert/strict";
import { McpGuardProxyServer } from "../src/guard/index.js";

const manifest = { server: { name: "test" }, tools: [{ name: "search_docs" }, { name: "send_external_message" }, { name: "delete_workspace_file" }] };
const policy = { allow: ["search_docs"], approvalRequired: ["send_external_message"], block: ["delete_workspace_file"] };
let forwarded = 0;
const server = new McpGuardProxyServer({ manifest, policy, serverHandler: async () => { forwarded++; return { ok: true }; } });
const address = await server.start();
assert.ok(address.url.startsWith("http://127.0.0.1:"));
const health = await fetch(`${address.url}/health`);
assert.equal((await health.json()).ok, true);
async function call(name, id) {
  const res = await fetch(`${address.url}/rpc`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } }) });
  return res.json();
}
const allowed = await call("search_docs", 1);
assert.equal(allowed.result.server.ok, true);
const approval = await call("send_external_message", 2);
assert.equal(approval.error.code, -32001);
const blocked = await call("delete_workspace_file", 3);
assert.equal(blocked.error.code, -32003);
assert.equal(forwarded, 1);
const report = server.report();
assert.equal(report.mcpProxy.forwarded, 1);
assert.equal(report.serverBoundary.network, "local loopback only");
await server.stop();
console.log("mcp proxy server tests passed");
