#!/usr/bin/env node
import { createQuickstartGuard, printResult } from "../_shared/tool-governance.js";

const guard = createQuickstartGuard({ runId: "quickstart-03" });
const decision = guard.evaluateToolCall({
  toolId: "send_external_message",
  subject: "customer@example.com",
  inputPreview: "Send a support summary outside the local workspace."
});
const report = guard.report({
  title: "RuleOak quickstart approval report",
  summary: "A risky external action is paused for human review."
});

printResult("RuleOak quickstart 03 — require approval", {
  toolId: decision.toolId,
  decision: decision.decision,
  approvalRequired: decision.approvalRequired,
  approvalRequestId: decision.approvalRequestId,
  approvalCount: report.approvals.length
});

if (!decision.approvalRequired || !decision.approvalRequestId) process.exit(1);
