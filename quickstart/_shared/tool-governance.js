import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ToolGuard, ToolManifest } from "../../src/guard/index.js";
import { ReportExporter } from "../../src/runtime/index.js";
import { renderReportFile } from "../../src/reports/index.js";

export function createQuickstartGuard({ runId = "roak-quickstart-run", actor = "developer", policy = null } = {}) {
  const manifest = new ToolManifest({
    metadata: { source: "ruleoak-quickstart", purpose: "developer-adoption" },
    tools: [
      { id: "search_docs", name: "search_docs", kind: "retrieval", risk: "low", description: "Search local documentation." },
      { id: "write_file", name: "write_file", kind: "filesystem", risk: "medium", description: "Write one project file." },
      { id: "send_external_message", name: "send_external_message", kind: "external_action", risk: "high", description: "Send a message outside the local workspace." },
      { id: "delete_workspace", name: "delete_workspace", kind: "destructive_command", risk: "critical", description: "Delete a workspace or important files." }
    ]
  });
  const activePolicy = policy || {
    boundary: "local_first_tool_boundary",
    allowedTools: ["search_docs", "write_file"],
    approvalRequired: ["send_external_message"],
    blockedTools: ["delete_workspace"]
  };
  return new ToolGuard({ manifest, policy: activePolicy, actor, runId });
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

export function exportGuardReport({ guard, jsonPath, htmlPath, title, summary }) {
  const report = guard.report({ title, summary });
  ReportExporter.writeJson(jsonPath, report);
  if (htmlPath) renderReportFile(jsonPath, htmlPath);
  return report;
}

export function printResult(title, payload) {
  console.log(`\n${title}`);
  console.log(JSON.stringify(payload, null, 2));
}
