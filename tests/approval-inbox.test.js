import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../src/approval/index.js";

const dir = mkdtempSync(join(tmpdir(), "ruleoak-approval-inbox-"));
const reportPath = join(dir, "report.json");
writeFileSync(reportPath, JSON.stringify({
  approvals: [{ id: "approval-1", action: "send_external_message", subject: "status update", reason: "external communication requires review", status: "pending" }],
  toolDecisions: [{ requestId: "tool-1", toolId: "cloud_llm_generate", approvalRequired: true, reason: "cloud LLM requires approval", risk: "high", evidenceId: "ev-1" }]
}, null, 2));

const store = ApprovalInboxStore.fromReports([reportPath], { path: join(dir, "approvals.json") });
assert.equal(store.summary().pending, 2);
store.approve("approval-1", { actor: "tester", reason: "ok" });
assert.equal(store.summary().approved, 1);
store.reject("tool-1", { actor: "tester", reason: "no" });
assert.equal(store.summary().rejected, 1);
const html = renderApprovalInboxHtml(store.state);
assert.ok(html.includes("Local Approval Inbox"));
assert.ok(html.includes("send_external_message"));

// Exercise end-user command after reports exist.
execFileSync(process.execPath, [join(process.cwd(), "examples", "tool-guard-demo", "run.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(process.cwd(), "scripts", "approval-inbox.js"), "build"], { stdio: "pipe" });
console.log("approval-inbox tests passed");
