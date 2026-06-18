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

export function validateGovernanceRecord(record, expectedType) {
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
  if (record.schemaVersion !== "ruleoak.governance.v1") {
    throw new Error(`${type}.schemaVersion must be ruleoak.governance.v1`);
  }
  if (record.recordType !== type) throw new Error(`recordType mismatch: expected ${type}, got ${record.recordType}`);
  const enums = ENUMS[type] || {};
  for (const [field, allowed] of Object.entries(enums)) {
    if (record[field] !== undefined && !allowed.includes(record[field])) {
      throw new Error(`${type}.${field} must be one of ${allowed.join(", ")}`);
    }
  }
  return { valid: true, recordType: type, schemaVersion: record.schemaVersion };
}

export function validateMany(records = []) {
  if (!Array.isArray(records)) throw new Error("validateMany expects an array");
  return records.map((record) => validateGovernanceRecord(record));
}
