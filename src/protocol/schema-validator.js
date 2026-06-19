const GOVERNANCE_SCHEMA_VERSION = "ruleoak.governance.v1";
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?Z$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

const ENUMS = {
  RunRecord: { status: ["created", "running", "completed", "failed", "cancelled"] },
  PolicyDecisionRecord: { effect: ["allow", "deny", "approval_required"], decision: ["allowed", "blocked", "approval_required"] },
  ApprovalRecord: { decision: ["approved", "rejected", "needs_review", "not_required", "pending"] }
};

export const recordRequirements = {
  RunRecord: ["schemaVersion", "recordType", "runId", "domain", "workflow", "actor", "status", "createdAt"],
  EvidenceRecord: ["schemaVersion", "recordType", "evidenceId", "runId", "action", "subject", "createdAt", "hash"],
  ApprovalRecord: ["schemaVersion", "recordType", "approvalId", "runId", "action", "subject", "decision", "actor", "createdAt"],
  AuditEvent: ["schemaVersion", "recordType", "eventId", "runId", "eventType", "createdAt"],
  PolicyDecisionRecord: ["schemaVersion", "recordType", "decisionId", "runId", "action", "subject", "effect", "createdAt"],
  ReportRecord: ["schemaVersion", "recordType", "reportId", "runId", "title", "summary", "createdAt"]
};

const ALLOWED_FIELDS = {
  RunRecord: new Set([...recordRequirements.RunRecord, "updatedAt", "metadata", "recordHash"]),
  EvidenceRecord: new Set([...recordRequirements.EvidenceRecord, "subjectType", "source", "metadata", "redactionManifestId", "recordHash"]),
  PolicyDecisionRecord: new Set([...recordRequirements.PolicyDecisionRecord, "decision", "matchedRuleIds", "reason", "metadata", "recordHash"]),
  ApprovalRecord: new Set([...recordRequirements.ApprovalRecord, "reason", "metadata", "recordHash"]),
  AuditEvent: new Set([...recordRequirements.AuditEvent, "action", "subject", "actor", "policyDecision", "evidenceId", "approvalId", "metadata", "sequence", "previousHash", "eventHash", "recordHash"]),
  ReportRecord: new Set([...recordRequirements.ReportRecord, "records", "metadata", "recordHash"])
};

const FIELD_TYPES = {
  schemaVersion: "string",
  recordType: "string",
  runId: "string",
  domain: "string",
  workflow: "string",
  actor: "string",
  status: "string",
  createdAt: "timestamp",
  updatedAt: "timestamp|null",
  metadata: "object",
  evidenceId: "string",
  action: "string|null",
  subject: "string|null",
  subjectType: "string",
  source: "string",
  hash: "hash-string",
  decisionId: "string",
  effect: "string",
  decision: "string",
  matchedRuleIds: "string[]",
  reason: "string|null",
  approvalId: "string",
  eventId: "string",
  eventType: "string",
  policyDecision: "string|null",
  evidenceId: "string|null",
  approvalId: "string|null",
  sequence: "integer",
  previousHash: "hash-string|null",
  eventHash: "hash-string",
  reportId: "string",
  title: "string",
  summary: "summary",
  records: "array",
  recordHash: "hash-string",
  redactionManifestId: "string"
};

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateType(field, value, type) {
  if (type === "string") {
    if (typeof value !== "string" || value.length === 0) throw new Error(`${field} must be a non-empty string`);
    return;
  }
  if (type === "string|null") {
    if (value !== null && value !== undefined && typeof value !== "string") throw new Error(`${field} must be a string or null`);
    return;
  }
  if (type === "timestamp") {
    if (typeof value !== "string" || !ISO_UTC.test(value)) throw new Error(`${field} must be an ISO-8601 UTC timestamp ending in Z`);
    return;
  }
  if (type === "timestamp|null") {
    if (value === null || value === undefined) return;
    if (typeof value !== "string" || !ISO_UTC.test(value)) throw new Error(`${field} must be an ISO-8601 UTC timestamp ending in Z or null`);
    return;
  }
  if (type === "object") {
    if (!isObject(value)) throw new Error(`${field} must be an object`);
    return;
  }
  if (type === "string[]") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${field} must be an array of strings`);
    return;
  }
  if (type === "array") {
    if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
    return;
  }
  if (type === "integer") {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
    return;
  }
  if (type === "hash-string") {
    if (typeof value !== "string" || value.length === 0) throw new Error(`${field} must be a non-empty hash string`);
    return;
  }
  if (type === "hash-string|null") {
    if (value === null || value === undefined) return;
    if (typeof value !== "string" || value.length === 0) throw new Error(`${field} must be a hash string or null`);
    return;
  }
  if (type === "summary") {
    if (!(typeof value === "string" || isObject(value))) throw new Error(`${field} must be a string or object`);
  }
}

export function validateGovernanceRecord(record, expectedType, { strict = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("record must be an object");
  const type = expectedType || record.recordType;
  if (!type) throw new Error("recordType is required");
  const required = recordRequirements[type];
  if (!required) throw new Error(`unknown RuleOak record type: ${type}`);
  for (const field of required) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      throw new Error(`${type}.${field} is required`);
    }
  }
  if (record.schemaVersion !== GOVERNANCE_SCHEMA_VERSION) throw new Error(`${type}.schemaVersion must be ${GOVERNANCE_SCHEMA_VERSION}`);
  if (record.recordType !== type) throw new Error(`recordType mismatch: expected ${type}, got ${record.recordType}`);
  if (strict) {
    const allowed = ALLOWED_FIELDS[type];
    for (const field of Object.keys(record)) {
      if (!allowed.has(field)) throw new Error(`${type}.${field} is not part of RuleOak Governance Protocol v1`);
    }
  }
  for (const [field, value] of Object.entries(record)) {
    const fieldType = FIELD_TYPES[field];
    if (fieldType) validateType(`${type}.${field}`, value, fieldType);
  }
  const enums = ENUMS[type] || {};
  for (const [field, allowed] of Object.entries(enums)) {
    if (record[field] !== undefined && !allowed.includes(record[field])) {
      throw new Error(`${type}.${field} must be one of ${allowed.join(", ")}`);
    }
  }
  if (record.hash && SHA256_HEX.test(record.hash)) {
    // Hex SHA-256 is the canonical new-format hash. Non-hex legacy fixture hashes remain accepted for v1 compatibility.
  }
  return { valid: true, recordType: type, schemaVersion: record.schemaVersion, strict };
}

export function validateMany(records = [], options = {}) {
  if (!Array.isArray(records)) throw new Error("validateMany expects an array");
  return records.map((record) => validateGovernanceRecord(record, undefined, options));
}
