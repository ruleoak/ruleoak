import { createHash } from "node:crypto";
import { stableJson } from "./stable-json.js";

export const GOVERNANCE_SCHEMA_VERSION = "ruleoak.governance.v1";
export const GOVERNANCE_RECORD_TYPES = Object.freeze([
  "RunRecord",
  "EvidenceRecord",
  "PolicyDecisionRecord",
  "ApprovalRecord",
  "AuditEvent",
  "ReportRecord"
]);

const INTEGRITY_FIELDS = new Set(["hash", "recordHash", "eventHash", "bundleHash"]);

export function stripIntegrityFields(value) {
  if (Array.isArray(value)) return value.map(stripIntegrityFields);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (INTEGRITY_FIELDS.has(key)) continue;
      if (child === undefined) continue;
      out[key] = stripIntegrityFields(child);
    }
    return out;
  }
  return value;
}

export function canonicalPayload(record, { includeIntegrity = false } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("record must be an object");
  return includeIntegrity ? { ...record } : stripIntegrityFields(record);
}

export function canonicalJson(record, options = {}) {
  return stableJson(canonicalPayload(record, options));
}

export function recordHash(record) {
  return createHash("sha256").update(canonicalJson(record)).digest("hex");
}

export function canonicalTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid timestamp: ${value}`);
  return date.toISOString();
}

export function createProtocolEnvelope(record, { sdk = "ruleoak-core", sdkVersion = null, generatedAt = new Date().toISOString() } = {}) {
  if (!record || typeof record !== "object") throw new Error("record must be an object");
  const kind = record.recordType;
  if (!GOVERNANCE_RECORD_TYPES.includes(kind)) throw new Error(`unsupported governance record type: ${kind}`);
  return {
    protocol: GOVERNANCE_SCHEMA_VERSION,
    kind,
    record,
    sdk,
    sdkVersion,
    generatedAt: canonicalTimestamp(generatedAt)
  };
}

export function createRunRecord({ runId, domain = "generic", workflow = "governed-workflow", actor = "local-user", status = "running", createdAt = new Date().toISOString(), updatedAt = null, metadata = {} } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "RunRecord", runId: runId || `roak-run-${Date.now()}`, domain, workflow, actor, status, createdAt: canonicalTimestamp(createdAt), updatedAt: updatedAt ? canonicalTimestamp(updatedAt) : null, metadata };
}

export function createEvidenceRecord({ evidenceId, runId, action, subject, subjectType = "generic", source = "local", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  const base = { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "EvidenceRecord", evidenceId: evidenceId || `roak-evidence-${Date.now()}`, runId, action, subject, subjectType, source, metadata, createdAt: canonicalTimestamp(createdAt) };
  return { ...base, hash: recordHash(base) };
}

export function createPolicyDecisionRecord({ decisionId, runId, action, subject, effect = "approval_required", decision = null, matchedRuleIds = [], reason = "No reason provided.", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  const record = { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "PolicyDecisionRecord", decisionId: decisionId || `roak-decision-${Date.now()}`, runId, action, subject, effect, matchedRuleIds, reason, metadata, createdAt: canonicalTimestamp(createdAt) };
  if (decision) record.decision = decision;
  return record;
}

export function createApprovalRecord({ approvalId, runId, action, subject, decision = "needs_review", actor = "human-reviewer", reason = "Human review required.", metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "ApprovalRecord", approvalId: approvalId || `roak-approval-${Date.now()}`, runId, action, subject, decision, actor, reason, metadata, createdAt: canonicalTimestamp(createdAt) };
}

export function createAuditEvent({ eventId, runId, eventType, action = null, subject = null, actor = "ruleoak", policyDecision = null, evidenceId = null, approvalId = null, metadata = {}, createdAt = new Date().toISOString(), sequence = null, previousHash = null, eventHash = null } = {}) {
  const record = { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "AuditEvent", eventId: eventId || `roak-audit-${Date.now()}`, runId, eventType, action, subject, actor, policyDecision, evidenceId, approvalId, metadata, createdAt: canonicalTimestamp(createdAt) };
  if (sequence !== null && sequence !== undefined) record.sequence = sequence;
  if (previousHash !== null && previousHash !== undefined) record.previousHash = previousHash;
  if (eventHash !== null && eventHash !== undefined) record.eventHash = eventHash;
  return record;
}

export function createReportRecord({ reportId, runId, title = "RuleOak Governance Report", summary = {}, records = [], metadata = {}, createdAt = new Date().toISOString() } = {}) {
  return { schemaVersion: GOVERNANCE_SCHEMA_VERSION, recordType: "ReportRecord", reportId: reportId || `roak-report-${Date.now()}`, runId, title, summary, records, metadata, createdAt: canonicalTimestamp(createdAt) };
}
