import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { McpGuardProxy } from "../../src/guard/index.js";

const manifest = JSON.parse(readFileSync(new URL("./server-manifest.json", import.meta.url), "utf8"));
const policy = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));
const proxy = new McpGuardProxy({ manifest, policy, actor: "mcp-proxy-demo", serverHandler: async (request) => ({ echoedTool: request.params.name, content: [{ type: "text", text: "fixture result" }] }) });

const requests = [
  { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_docs", arguments: { query: "governance" } } },
  { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "send_external_message", arguments: { to: "external@example.com" } } },
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "delete_workspace_file", arguments: { path: "important.md" } } }
];
const responses = await proxy.handleBatch(requests);
const report = proxy.report();
mkdirSync("examples/mcp-proxy-demo/out", { recursive: true });
writeFileSync("examples/mcp-proxy-demo/out/mcp-proxy-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ responses, report: "examples/mcp-proxy-demo/out/mcp-proxy-report.json" }, null, 2));
