import { recordHash, canonicalTimestamp, GOVERNANCE_SCHEMA_VERSION } from "./record-factory.js";
import { validateGovernanceRecord } from "./schema-validator.js";

const BUNDLE_TYPE = "RuleOakEvidenceBundle";

function recordId(record) {
  if (record.recordType === "RunRecord") return record.runId || null;
  if (record.recordType === "EvidenceRecord") return record.evidenceId || null;
  if (record.recordType === "PolicyDecisionRecord") return record.decisionId || null;
  if (record.recordType === "ApprovalRecord") return record.approvalId || null;
  if (record.recordType === "AuditEvent") return record.eventId || null;
  if (record.recordType === "ReportRecord") return record.reportId || null;
  return record.runId || record.evidenceId || record.decisionId || record.approvalId || record.eventId || record.reportId || null;
}

function bundlePayload(bundle) {
  const { bundleHash, ...payload } = bundle;
  return payload;
}

function hashBundle(bundle) {
  return recordHash(bundlePayload(bundle));
}

export function createRedactionManifest({ manifestId, runId, fields = [], reason = "Not provided.", actor = "ruleoak", createdAt = new Date().toISOString(), metadata = {} } = {}) {
  return {
    protocol: GOVERNANCE_SCHEMA_VERSION,
    manifestType: "RuleOakRedactionManifest",
    manifestId: manifestId || `roak-redaction-${Date.now()}`,
    runId,
    fields: fields.map((field) => ({
      path: field.path,
      method: field.method || "hash_or_remove",
      reason: field.reason || reason
    })),
    reason,
    actor,
    createdAt: canonicalTimestamp(createdAt),
    metadata
  };
}

export function createEvidenceBundle({ bundleId, runId = null, records = [], redactionManifest = null, generatedAt = new Date().toISOString(), metadata = {} } = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new Error("records must contain at least one governance record");
  const normalizedRecords = records.map((record) => {
    validateGovernanceRecord(record);
    return record;
  });
  const resolvedRunId = runId || normalizedRecords.find((record) => record.runId)?.runId;
  const recordHashes = normalizedRecords.map((record) => ({
    recordType: record.recordType,
    id: recordId(record),
    hash: recordHash(record)
  }));
  const bundle = {
    protocol: GOVERNANCE_SCHEMA_VERSION,
    bundleType: BUNDLE_TYPE,
    bundleId: bundleId || `roak-evidence-bundle-${Date.now()}`,
    runId: resolvedRunId,
    generatedAt: canonicalTimestamp(generatedAt),
    records: normalizedRecords,
    recordHashes,
    redactionManifest,
    metadata
  };
  return { ...bundle, bundleHash: hashBundle(bundle) };
}

export function verifyEvidenceBundle(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("bundle must be an object");
  if (bundle.protocol !== GOVERNANCE_SCHEMA_VERSION) errors.push(`protocol must be ${GOVERNANCE_SCHEMA_VERSION}`);
  if (bundle.bundleType !== BUNDLE_TYPE) errors.push(`bundleType must be ${BUNDLE_TYPE}`);
  if (!Array.isArray(bundle.records) || bundle.records.length === 0) errors.push("records must be a non-empty array");
  if (!Array.isArray(bundle.recordHashes)) errors.push("recordHashes must be an array");
  const seen = new Set();
  const expectedHashes = [];
  for (const record of bundle.records || []) {
    try {
      validateGovernanceRecord(record);
      const id = recordId(record);
      const key = `${record.recordType}:${id}`;
      if (seen.has(key)) errors.push(`duplicate record in bundle: ${key}`);
      seen.add(key);
      expectedHashes.push({ recordType: record.recordType, id, hash: recordHash(record) });
    } catch (error) {
      errors.push(error.message);
    }
  }
  const actualHashes = bundle.recordHashes || [];
  if (JSON.stringify(actualHashes) !== JSON.stringify(expectedHashes)) errors.push("recordHashes do not match canonical record hashes");
  if (bundle.bundleHash !== hashBundle(bundle)) errors.push("bundleHash does not match canonical bundle payload");
  if (bundle.redactionManifest) {
    if (bundle.redactionManifest.protocol !== GOVERNANCE_SCHEMA_VERSION) errors.push("redactionManifest.protocol is invalid");
    if (bundle.runId && bundle.redactionManifest.runId && bundle.redactionManifest.runId !== bundle.runId) errors.push("redactionManifest.runId does not match bundle.runId");
  }
  return { valid: errors.length === 0, errors, recordCount: (bundle.records || []).length, bundleHash: bundle.bundleHash };
}
