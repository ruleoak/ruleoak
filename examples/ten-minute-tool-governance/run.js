#!/usr/bin/env node
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ToolGuard, ToolManifest } from "../../src/guard/index.js";
import { ReportExporter } from "../../src/runtime/index.js";

const here = new URL(".", import.meta.url).pathname;
const manifest = ToolManifest.fromFile(join(here, "tool-manifest.json"));
const policy = JSON.parse(readFileSync(join(here, "policy.json"), "utf8"));
const guard = new ToolGuard({
  manifest,
  policy,
  actor: "demo-agent",
  runId: "ten-minute-tool-governance-run"
});

const proposedToolCalls = [
  { requestId: "req-search-docs", toolId: "search_docs", subject: "local docs", inputPreview: "query: approval audit evidence" },
  { requestId: "req-send-message", toolId: "send_external_message", subject: "external recipient", inputPreview: "draft message: please review incident summary" },
  { requestId: "req-delete-file", toolId: "delete_workspace_file", subject: "workspace/archive.zip", inputPreview: "delete old archive" }
];

console.log("RuleOak 10-minute tool governance demo");
console.log("======================================");
console.log("proposed tool call -> policy decision -> evidence -> approval gate -> audit report");

for (const call of proposedToolCalls) {
  const decision = guard.evaluateToolCall(call);
  const icon = decision.allowedNow ? "ALLOW" : decision.approvalRequired ? "REVIEW" : "BLOCK";
  console.log(`${icon} ${decision.toolId}: ${decision.decision} — ${decision.reason}`);
}

const report = guard.report({
  title: "RuleOak 10-Minute Tool Governance Report",
  summary: "A minimal example showing policy, evidence, approval, and audit around proposed AI tool calls."
});
report.integrationPath = {
  step1: "Declare tools in tool-manifest.json.",
  step2: "Declare policy in policy.json.",
  step3: "Call ToolGuard.evaluateToolCall() before tool execution.",
  step4: "Use allowed / approval_required / blocked decision.",
  step5: "Export report for review."
};
report.protocolCompatibility = {
  protocol: "ruleoak.governance.v1",
  coreVersion: "2.0.1",
  note: "The report uses RuleOak governance records intended to remain compatible across the v2.x line unless documented otherwise."
};

mkdirSync(join(here, "out"), { recursive: true });
const reportPath = join(here, "out", "ten-minute-governance-report.json");
ReportExporter.writeJson(reportPath, report);
console.log(`Wrote ${reportPath}`);
