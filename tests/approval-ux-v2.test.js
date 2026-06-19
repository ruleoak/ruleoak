import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../src/approval/index.js";

const dir = mkdtempSync(join(tmpdir(), "ruleoak-approval-ux-v2-"));
const reportPath = join(dir, "report.json");
writeFileSync(reportPath, JSON.stringify({
  toolDecisions: [
    { requestId: "v2-1", toolId: "write_file", subject: "src/app.js", approvalRequired: true, reason: "file write requires review", risk: "medium", evidenceId: "ev-v2-1" },
    { requestId: "v2-2", toolId: "send_external_message", subject: "customer email", approvalRequired: true, reason: "external send requires review", risk: "high" }
  ]
}, null, 2));

const store = ApprovalInboxStore.fromReports([reportPath], { path: join(dir, "approvals.json") });
assert.equal(store.summary().version, "ruleoak.approval_ux.v2");
assert.equal(store.summary().pending, 2);
assert.equal(store.summary().risks.high, 1);
assert.equal(store.get("v2-1").priority, "normal");
assert.ok(store.get("v2-2").slaDueAt);

store.assign("v2-1", { reviewer: "lead_reviewer", reviewerRole: "engineering_approver" });
assert.equal(store.get("v2-1").reviewer, "lead_reviewer");

store.requestEvidence("v2-2", { actor: "lead_reviewer", evidence: ["business justification", "customer consent"], reason: "need more evidence" });
assert.equal(store.summary().evidenceRequested, 1);
assert.ok(store.get("v2-2").requestedEvidence.includes("business justification"));

store.approve("v2-1", { actor: "lead_reviewer", reason: "safe", note: "branch-only" });
store.reject("v2-2", { actor: "lead_reviewer", reason: "not enough evidence" });
assert.equal(store.summary().approved, 1);
assert.equal(store.summary().rejected, 1);

const decisionLog = store.exportDecisionLog(join(dir, "approval-decisions.jsonl"));
assert.ok(readFileSync(decisionLog, "utf8").includes("v2-2"));
const { path, packet } = store.exportApprovalPacket("v2-1", join(dir, "packet.json"));
assert.ok(existsSync(path));
assert.equal(packet.protocol, "ruleoak.approval_packet.v1");
assert.ok(packet.integrity.requestHash.length === 64);
assert.ok(packet.integrity.packetHash.length === 64);

const html = renderApprovalInboxHtml(store.state);
assert.ok(html.includes("Approval UX v2"));
assert.ok(html.includes("Reviewer"));
assert.ok(html.includes("SLA due"));
assert.ok(html.includes("Requested evidence"));
assert.ok(html.includes("approval:request-evidence"));

execFileSync(process.execPath, [join(process.cwd(), "examples", "approval-ux-v2", "run.js")], { stdio: "pipe" });
assert.ok(existsSync(join(process.cwd(), "examples", "approval-ux-v2", "out", "summary.json")));

console.log("approval UX v2 tests passed");
