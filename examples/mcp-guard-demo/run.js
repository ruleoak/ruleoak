import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpGuard } from "../../src/guard/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const policy = JSON.parse(readFileSync(join(here, "policy.json"), "utf8"));
const guard = McpGuard.fromServerFile(join(here, "server-manifest.json"), { policy, runId: "ruleoak-mcp-guard-demo", actor: "demo-agent" });

const requests = [
  { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_docs", arguments: { query: "approval policy" }, subject: "docs" } },
  { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "send_external_message", arguments: { recipient: "user@example.com", body: "draft" }, subject: "external_message" } },
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "delete_workspace_file", arguments: { path: "./important.md" }, subject: "workspace_file" } }
];

const decisions = guard.evaluateBatch(requests);
const report = guard.report({ summary: "MCP-style tool requests were governed before execution." });
mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out", "mcp-guard-report.json"), JSON.stringify(report, null, 2));

for (const d of decisions) console.log(`${d.toolId}: ${d.decision} — ${d.reason}`);
console.log(`Report: ${join(here, "out", "mcp-guard-report.json")}`);
