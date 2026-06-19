import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../../src/approval/index.js";

const outDir = join(process.cwd(), "examples", "approval-ux-v2", "out");
const statePath = join(outDir, "approvals.json");
const htmlPath = join(outDir, "index.html");
mkdirSync(outDir, { recursive: true });

const store = new ApprovalInboxStore({ path: statePath });
store.add({
  id: "approval-coding-write-file",
  action: "write_file",
  subject: "src/payment-rules.js",
  actor: "coding_agent",
  reason: "Source edits require human review before execution.",
  risk: "medium",
  evidenceId: "ev-test-output-001",
  reviewer: "engineering_reviewer",
  requestedEvidence: ["unit-test-output", "diff-summary"]
});
store.add({
  id: "approval-rag-sensitive-document",
  action: "read_restricted_document",
  subject: "internal-policy-compensation.pdf",
  actor: "rag_agent",
  reason: "Restricted HR document access requires reviewer approval.",
  risk: "high",
  reviewer: "knowledge_owner"
});
store.add({
  id: "approval-local-send-message",
  action: "send_external_message",
  subject: "email to vendor@example.com",
  actor: "local_assistant",
  reason: "External communication is approval-gated in the personal local-first policy pack.",
  risk: "medium"
});

store.requestEvidence("approval-rag-sensitive-document", {
  actor: "knowledge_owner",
  reason: "Need business purpose and source-document citation before approval.",
  evidence: ["business-purpose", "source-citation-list"],
  note: "Sensitive-document review should stay local-first."
});
store.approve("approval-coding-write-file", { actor: "engineering_reviewer", reason: "Diff and tests reviewed.", note: "Safe to proceed in feature branch only." });
store.reject("approval-local-send-message", { actor: "human_owner", reason: "Vendor message needs rewrite before sending." });

writeFileSync(htmlPath, renderApprovalInboxHtml(store.state));
const packet = store.exportApprovalPacket("approval-rag-sensitive-document", join(outDir, "approval-rag-sensitive-document.packet.json"));
const logPath = store.exportDecisionLog(join(outDir, "approval-decisions.jsonl"));

const summary = {
  name: "Approval UX v2 reference",
  statePath,
  htmlPath,
  packetPath: packet.path,
  decisionLogPath: logPath,
  summary: store.summary()
};
writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
