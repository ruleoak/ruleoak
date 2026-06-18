import { createHash } from "node:crypto";
import { stableJson } from "./stable-json.js";

export const GOVERNANCE_SCHEMA_VERSION = "ruleoak.governance.v1";

export function recordHash(record) {
  return createHash("sha256").update(stableJson(record)).digest("hex");
}

export function createRunRecord({ runId, domain = "generic", workflow = "governed-workflow", actor = "local-user", status = "running", createdAt = new Date().toISOString(), updatedAt = null, metadata = {} } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "RunRecord", runId: runId || `roak-run-${Date.now()}`, domain, workflow, actor, status, createdAt, updatedAt, metadata };
}

export function createEvidenceRecord({ evidenceId, runId, action, subject, subjectType = "generic", source = "local", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  const base = { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "EvidenceRecord", evidenceId: evidenceId || `roak-evidence-${Date.now()}`, runId, action, subject, subjectType, source, metadata, createdAt };
  return { ...base, hash: recordHash(base) };
}

export function createPolicyDecisionRecord({ decisionId, runId, action, subject, effect = "approval_required", matchedRuleIds = [], reason = "No reason provided.", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "PolicyDecisionRecord", decisionId: decisionId || `roak-decision-${Date.now()}`, runId, action, subject, effect, matchedRuleIds, reason, metadata, createdAt };
}

export function createApprovalRecord({ approvalId, runId, action, subject, decision = "needs_review", actor = "human-reviewer", reason = "Human review required.", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "ApprovalRecord", approvalId: approvalId || `roak-approval-${Date.now()}`, runId, action, subject, decision, actor, reason, metadata, createdAt };
}

export function createAuditEvent({ eventId, runId, eventType, action = null, subject = null, actor = "ruleoak", policyDecision = null, evidenceId = null, approvalId = null, metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "AuditEvent", eventId: eventId || `roak-audit-${Date.now()}`, runId, eventType, action, subject, actor, policyDecision, evidenceId, approvalId, metadata, createdAt };
}

export function createReportRecord({ reportId, runId, title = "RuleOak Governance Report", summary = {}, records = [], metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "ReportRecord", reportId: reportId || `roak-report-${Date.now()}`, runId, title, summary, records, metadata, createdAt };
}
