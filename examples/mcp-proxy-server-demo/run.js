import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { McpGuardProxyServer } from "../../src/guard/index.js";

const manifest = JSON.parse(readFileSync(new URL("./server-manifest.json", import.meta.url), "utf8"));
const policy = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));

const proxyServer = new McpGuardProxyServer({
  manifest,
  policy,
  actor: "mcp-proxy-server-demo",
  serverHandler: async (request) => ({ echoedTool: request.params.name, content: [{ type: "text", text: "fixture result from local proxy server" }] })
});

const address = await proxyServer.start();
const requests = [
  { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_docs", arguments: { query: "governance" } } },
  { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "send_external_message", arguments: { to: "external@example.com" } } },
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "delete_workspace_file", arguments: { path: "important.md" } } }
];

const responses = [];
for (const request of requests) {
  const response = await fetch(`${address.url}/rpc`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
  responses.push(await response.json());
}
const report = proxyServer.report({ title: "RuleOak Local MCP Guard Proxy Server Report" });
mkdirSync("examples/mcp-proxy-server-demo/out", { recursive: true });
writeFileSync("examples/mcp-proxy-server-demo/out/mcp-proxy-server-report.json", JSON.stringify(report, null, 2));
await proxyServer.stop();
console.log(JSON.stringify({ address, responses, report: "examples/mcp-proxy-server-demo/out/mcp-proxy-server-report.json" }, null, 2));
