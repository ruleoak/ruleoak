#!/usr/bin/env node
import { createQuickstartGuard, printResult } from "../_shared/tool-governance.js";

const guard = createQuickstartGuard({ runId: "quickstart-01" });
const decision = guard.evaluateToolCall({
  toolId: "search_docs",
  subject: "README.md",
  inputPreview: "Find how to add RuleOak to an existing tool call."
});

printResult("RuleOak quickstart 01 — govern one tool call", {
  toolId: decision.toolId,
  decision: decision.decision,
  allowedNow: decision.allowedNow,
  evidenceId: decision.evidenceId,
  reason: decision.reason
});

if (!decision.allowedNow || decision.decision !== "allowed") process.exit(1);
