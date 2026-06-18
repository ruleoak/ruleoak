#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ToolGuard, ToolManifest, McpGuard } from "../../src/guard/index.js";
import { ReportExporter } from "../../src/runtime/index.js";

const here = new URL(".", import.meta.url).pathname;
const manifest = ToolManifest.fromFile(join(here, "tool-manifest.json"));
const policy = JSON.parse(readFileSync(join(here, "policy.json"), "utf8"));
const guard = new ToolGuard({ manifest, policy, actor: "demo-agent", runId: "tool-guard-demo-run" });

const calls = [
  { toolId: "search_docs", subject: "local docs", inputPreview: "query: governance audit" },
  { toolId: "send_external_message", subject: "external recipient", inputPreview: "message draft" },
  { toolId: "delete_workspace_file", subject: "workspace/report.json", inputPreview: "delete request" }
];

console.log("RuleOak Tool Guard demo");
console.log("=======================");
for (const call of calls) {
  const decision = guard.evaluateToolCall(call);
  console.log(`${decision.toolId}: ${decision.decision} — ${decision.reason}`);
}

const mcpServer = {
  name: "demo-mcp-server",
  tools: [
    { name: "search_docs", description: "Search local docs." },
    { name: "send_external_message", description: "Send message to external party." },
    { name: "delete_workspace_file", description: "Delete local file." }
  ]
};
const mcpGuard = new McpGuard({ server: mcpServer, policy, actor: "demo-mcp-client", runId: "mcp-guard-demo-run" });
const mcpDecision = mcpGuard.evaluateMcpToolCall({ name: "send_external_message", arguments: { to: "user@example.com", body: "draft" }, subject: "external communication" });
console.log(`mcp:${mcpDecision.toolId}: ${mcpDecision.decision} — ${mcpDecision.reason}`);

mkdirSync(join(here, "out"), { recursive: true });
const toolReportPath = join(here, "out", "tool-guard-report.json");
const mcpReportPath = join(here, "out", "mcp-guard-report.json");
ReportExporter.writeJson(toolReportPath, guard.report());
ReportExporter.writeJson(mcpReportPath, mcpGuard.report());
console.log(`Wrote ${toolReportPath}`);
console.log(`Wrote ${mcpReportPath}`);
