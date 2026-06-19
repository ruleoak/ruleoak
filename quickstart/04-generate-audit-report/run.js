#!/usr/bin/env node
import { resolve } from "node:path";
import { createQuickstartGuard, exportGuardReport, printResult } from "../_shared/tool-governance.js";

const outDir = resolve("quickstart/out/04-generate-audit-report");
const guard = createQuickstartGuard({ runId: "quickstart-04" });

guard.evaluateToolCall({ toolId: "search_docs", subject: "docs/adoption/10-minute-quickstart.md" });
guard.evaluateToolCall({ toolId: "send_external_message", subject: "reviewer@example.com" });
guard.evaluateToolCall({ toolId: "delete_workspace", subject: "./" });

const report = exportGuardReport({
  guard,
  jsonPath: `${outDir}/report.json`,
  htmlPath: `${outDir}/report.html`,
  title: "RuleOak quickstart audit report",
  summary: "Allowed, approval-required, and blocked decisions in one local report."
});

printResult("RuleOak quickstart 04 — generate audit report", {
  json: `${outDir}/report.json`,
  html: `${outDir}/report.html`,
  decisions: report.summary.toolDecisionCount,
  allowed: report.summary.allowed,
  approvalRequired: report.summary.approvalRequired,
  blocked: report.summary.blocked
});

if (report.summary.allowed !== 1 || report.summary.approvalRequired !== 1 || report.summary.blocked !== 1) process.exit(1);
