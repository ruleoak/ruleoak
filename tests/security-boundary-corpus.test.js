import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ToolGuard } from "../src/guard/index.js";

const corpus = JSON.parse(readFileSync("tests/fixtures/security/security-boundary-corpus.json", "utf8"));
const guard = new ToolGuard({
  manifest: { tools: corpus.map((item) => ({ id: item.action, name: item.action, risk: item.expected === "deny" ? "high" : "medium" })) },
  policy: {
    boundary: "local_only",
    allowedTools: ["read_docs"],
    blockedTools: ["delete_workspace_file", "read_secret_file"],
    approvalRequired: ["send_external_message", "cloud_llm_call"]
  },
  actor: "security-corpus"
});
for (const item of corpus) {
  const result = guard.evaluateToolCall({ toolId: item.action, subject: item.reason });
  const normalized = result.blocked ? "deny" : result.approvalRequired ? "approval_required" : "allow";
  assert.equal(normalized, item.expected, `${item.action} expected ${item.expected}`);
}
const report = guard.report({ title: "Security boundary corpus" });
assert.equal(report.summary.toolDecisionCount, corpus.length);
assert.ok(report.summary.blocked >= 2);
assert.ok(report.summary.approvalRequired >= 2);
console.log("security-boundary-corpus tests passed");
