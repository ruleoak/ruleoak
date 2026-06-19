#!/usr/bin/env node
import { createQuickstartGuard, printResult } from "../_shared/tool-governance.js";

const guard = createQuickstartGuard({ runId: "quickstart-02" });
const decision = guard.evaluateToolCall({
  toolId: "delete_workspace",
  subject: "./",
  inputPreview: "rm -rf ./important-project"
});

printResult("RuleOak quickstart 02 — block a dangerous command", {
  toolId: decision.toolId,
  decision: decision.decision,
  blocked: decision.blocked,
  allowedNow: decision.allowedNow,
  reason: decision.reason
});

if (!decision.blocked || decision.allowedNow) process.exit(1);
