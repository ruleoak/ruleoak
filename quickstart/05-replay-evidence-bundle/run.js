#!/usr/bin/env node
import { resolve } from "node:path";
import {
  createRunRecord,
  createEvidenceRecord,
  createPolicyDecisionRecord,
  createApprovalRecord,
  createAuditEvent,
  createReportRecord,
  createEvidenceBundle,
  verifyEvidenceBundle,
  appendAuditEventChain,
  verifyAuditEventChain
} from "../../src/protocol/index.js";
import { writeJson, printResult } from "../_shared/tool-governance.js";

const outDir = resolve("quickstart/out/05-replay-evidence-bundle");
const runId = "quickstart-05";
const run = createRunRecord({ runId, domain: "developer-adoption", workflow: "replay-evidence-bundle", actor: "developer", status: "completed" });
const evidence = createEvidenceRecord({ runId, evidenceId: "quickstart-05-evidence", action: "send_external_message", subject: "reviewer@example.com", subjectType: "external_recipient", source: "quickstart", metadata: { inputPreview: "Draft message only" } });
const decision = createPolicyDecisionRecord({ runId, decisionId: "quickstart-05-decision", action: "send_external_message", subject: "reviewer@example.com", effect: "approval_required", matchedRuleIds: ["external-send-approval"], reason: "External messages require review." });
const approval = createApprovalRecord({ runId, approvalId: "quickstart-05-approval", action: "send_external_message", subject: "reviewer@example.com", decision: "needs_review", reason: "Human review required before external send." });
let audit = [];
audit = appendAuditEventChain(audit, createAuditEvent({ runId, eventId: "quickstart-05-audit-1", eventType: "tool.requested", action: "send_external_message", subject: "reviewer@example.com" }));
audit = appendAuditEventChain(audit, createAuditEvent({ runId, eventId: "quickstart-05-audit-2", eventType: "policy.decision", action: "send_external_message", subject: "reviewer@example.com", policyDecision: decision.decisionId, evidenceId: evidence.evidenceId }));
audit = appendAuditEventChain(audit, createAuditEvent({ runId, eventId: "quickstart-05-audit-3", eventType: "approval.requested", action: "send_external_message", subject: "reviewer@example.com", approvalId: approval.approvalId }));
const report = createReportRecord({ runId, reportId: "quickstart-05-report", title: "RuleOak replayable evidence bundle", summary: { decisions: 1, approvals: 1 }, records: [run.runId, evidence.evidenceId, decision.decisionId, approval.approvalId] });
const bundle = createEvidenceBundle({ bundleId: "quickstart-05-bundle", runId, records: [run, evidence, decision, approval, report], metadata: { purpose: "developer-adoption-quickstart" } });
const bundleResult = verifyEvidenceBundle(bundle);
const chainResult = verifyAuditEventChain(audit);

writeJson(`${outDir}/evidence-bundle.json`, bundle);
writeJson(`${outDir}/audit-chain.json`, audit);
writeJson(`${outDir}/replay-result.json`, { evidenceBundle: bundleResult, auditChain: chainResult });

printResult("RuleOak quickstart 05 — replay evidence bundle", {
  bundle: `${outDir}/evidence-bundle.json`,
  auditChain: `${outDir}/audit-chain.json`,
  bundleValid: bundleResult.valid,
  auditChainValid: chainResult.valid,
  recordCount: bundleResult.recordCount
});

if (!bundleResult.valid || !chainResult.valid) process.exit(1);
