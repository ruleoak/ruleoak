
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../src/approval/index.js";

const dir = mkdtempSync(join(tmpdir(), "ruleoak-approval-ux-"));
const reportPath = join(dir, "report.json");
writeFileSync(reportPath, JSON.stringify({
  toolDecisions: [
    { requestId: "ux-1", toolId: "send_external_message", subject: "customer update", approvalRequired: true, reason: "external communication requires approval", risk: "high", evidenceId: "ev-ux-1" },
    { requestId: "ux-2", toolId: "cloud_llm_generate", subject: "draft summary", approvalRequired: true, reason: "cloud LLM use requires approval", risk: "medium", evidenceId: "ev-ux-2" }
  ]
}, null, 2));

const store = ApprovalInboxStore.fromReports([reportPath], { path: join(dir, "approvals.json") });
assert.equal(store.summary().pending, 2);
assert.equal(store.summary().risks.high, 1);

store.approve("ux-1", { actor: "reviewer", reason: "safe after evidence review", note: "Evidence matches request" });
const approved = store.get("ux-1");
assert.equal(approved.status, "approved");
assert.ok(approved.history.some((entry) => entry.event === "approved"));

const exportPath = store.exportDecisionLog(join(dir, "approval-decisions.jsonl"));
assert.ok(existsSync(exportPath));
assert.ok(readFileSync(exportPath, "utf8").includes("ux-1"));

const html = renderApprovalInboxHtml(store.state);
assert.ok(html.includes("Approval Inbox"));
assert.ok(html.includes("Policy reason"));
assert.ok(html.includes("Review history"));
assert.ok(html.includes("npm run approval:approve"));

console.log("approval inbox UX tests passed");
