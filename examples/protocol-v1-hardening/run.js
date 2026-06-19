import { mkdirSync, writeFileSync } from "node:fs";
import {
  appendAuditEventChain,
  createApprovalRecord,
  createAuditEvent,
  createEvidenceBundle,
  createEvidenceRecord,
  createPolicyDecisionRecord,
  createRedactionManifest,
  createRunRecord
} from "../../src/protocol/index.js";

const outDir = "examples/protocol-v1-hardening/out";
mkdirSync(outDir, { recursive: true });
const createdAt = "2026-01-01T00:00:00.000Z";
const run = createRunRecord({ runId: "sre-threshold-change-001", domain: "sre", workflow: "monitoring-threshold-change", actor: "sre-lead", status: "completed", createdAt, updatedAt: createdAt });
const evidence = createEvidenceRecord({ evidenceId: "evidence-jira-001", runId: run.runId, action: "read_ticket", subject: "SRE-1234", subjectType: "jira-ticket", source: "fixture", metadata: { requester: "masked", service: "payments-api" }, createdAt });
const decision = createPolicyDecisionRecord({ decisionId: "decision-threshold-001", runId: run.runId, action: "change_alert_threshold", subject: "payments-api-latency-alert", effect: "approval_required", matchedRuleIds: ["sre.monitoring.threshold-change.approval"], reason: "Monitoring threshold changes require human approval and evidence.", createdAt });
const approval = createApprovalRecord({ approvalId: "approval-threshold-001", runId: run.runId, action: decision.action, subject: decision.subject, decision: "approved", actor: "sre-lead", reason: "Ticket, service owner context, and rollback note are present.", createdAt });
let audit = [];
audit = appendAuditEventChain(audit, createAuditEvent({ eventId: "audit-policy-001", runId: run.runId, eventType: "policy_checked", action: decision.action, subject: decision.subject, actor: "ruleoak", policyDecision: decision.effect, evidenceId: evidence.evidenceId, createdAt }));
audit = appendAuditEventChain(audit, createAuditEvent({ eventId: "audit-approval-001", runId: run.runId, eventType: "approval_recorded", action: approval.action, subject: approval.subject, actor: approval.actor, approvalId: approval.approvalId, createdAt }));
const redactionManifest = createRedactionManifest({ manifestId: "redaction-sre-001", runId: run.runId, actor: "ruleoak", reason: "Mask user identifiers before sharing evidence bundle.", fields: [{ path: "records[1].metadata.requester", method: "mask", reason: "personal identifier" }], createdAt });
const bundle = createEvidenceBundle({ bundleId: "bundle-sre-threshold-change-001", runId: run.runId, records: [run, evidence, decision, approval, ...audit], redactionManifest, generatedAt: createdAt, metadata: { example: "protocol-v1-hardening" } });
writeFileSync(`${outDir}/audit-log.json`, JSON.stringify(audit, null, 2));
writeFileSync(`${outDir}/evidence-bundle.json`, JSON.stringify(bundle, null, 2));
console.log(JSON.stringify({ outDir, records: bundle.records.length, bundleHash: bundle.bundleHash }, null, 2));
