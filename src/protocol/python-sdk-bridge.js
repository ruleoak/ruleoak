import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { validateGovernanceRecord } from "./schema-validator.js";
import { recordHash } from "./record-factory.js";

export const PYTHON_SDK_BRIDGE = {
  sdk: "ruleoak-py",
  minimumVersion: "0.3.0",
  protocol: "ruleoak.governance.v1",
  status: "compatible",
  coreLine: "RuleOak Core future major releases",
  recordContract: "RuleOak Governance Protocol v1"
};

const KIND_TO_RECORD_TYPE = {
  RunRecord: "RunRecord",
  EvidenceRecord: "EvidenceRecord",
  PolicyDecisionRecord: "PolicyDecisionRecord",
  ApprovalRecord: "ApprovalRecord",
  AuditEvent: "AuditEvent",
  ReportRecord: "ReportRecord"
};

const FIELD_MAP = {
  run_id: "runId",
  evidence_id: "evidenceId",
  decision_id: "decisionId",
  approval_id: "approvalId",
  event_id: "eventId",
  report_id: "reportId",
  subject_type: "subjectType",
  created_at: "createdAt",
  updated_at: "updatedAt",
  event_type: "eventType",
  policy_decision: "policyDecision",
  matched_rule_ids: "matchedRuleIds"
};

function camelizeRecordFields(value) {
  if (Array.isArray(value)) return value.map(camelizeRecordFields);
  if (!value || typeof value !== "object") return value;
  const converted = {};
  for (const [key, child] of Object.entries(value)) {
    const outKey = FIELD_MAP[key] || key;
    converted[outKey] = camelizeRecordFields(child);
  }
  return converted;
}

function normalizeEffectAndDecision(record) {
  if (record.recordType === "PolicyDecisionRecord") {
    if (record.decision && !record.effect) record.effect = record.decision;
    if (!record.decision && record.effect === "allow") record.decision = "allowed";
    if (!record.decision && record.effect === "deny") record.decision = "blocked";
    if (!record.decision && record.effect === "approval_required") record.decision = "approval_required";
    if (record.effect === "allowed") record.effect = "allow";
    if (record.effect === "blocked") record.effect = "deny";
  }
  return record;
}

function normalizeHash(record) {
  if (record.recordType === "EvidenceRecord" && !record.hash) {
    record.hash = recordHash({ ...record, hash: undefined });
  }
  return record;
}

export function isPythonProtocolEnvelope(value) {
  return Boolean(value && typeof value === "object" && value.protocol && value.kind && value.record);
}

export function normalizePythonSdkRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Python SDK record must be an object");

  if (isPythonProtocolEnvelope(input)) {
    if (input.protocol !== PYTHON_SDK_BRIDGE.protocol) throw new Error(`Python SDK protocol must be ${PYTHON_SDK_BRIDGE.protocol}`);
    const recordType = KIND_TO_RECORD_TYPE[input.kind];
    if (!recordType) throw new Error(`unsupported Python SDK record kind: ${input.kind}`);
    const record = camelizeRecordFields(input.record);
    record.schemaVersion = input.protocol;
    record.recordType = recordType;
    record.metadata = {
      ...(record.metadata || {}),
      emittedBy: input.sdk || PYTHON_SDK_BRIDGE.sdk,
      sdkVersion: input.sdk_version || input.sdkVersion || null,
      pythonEnvelopeKind: input.kind
    };
    return normalizeHash(normalizeEffectAndDecision(record));
  }

  const directRecord = camelizeRecordFields(input);
  if (directRecord.protocol && !directRecord.schemaVersion) directRecord.schemaVersion = directRecord.protocol;
  if (directRecord.kind && !directRecord.recordType) directRecord.recordType = KIND_TO_RECORD_TYPE[directRecord.kind] || directRecord.kind;
  return normalizeHash(normalizeEffectAndDecision(directRecord));
}

export function validatePythonSdkBridgeRecord(input) {
  const normalized = normalizePythonSdkRecord(input);
  const validation = validateGovernanceRecord(normalized);
  return {
    ...validation,
    sdk: PYTHON_SDK_BRIDGE.sdk,
    minimumVersion: PYTHON_SDK_BRIDGE.minimumVersion,
    protocol: PYTHON_SDK_BRIDGE.protocol,
    normalized
  };
}

export function loadPythonSdkBridgeRecords(inputDir = "tests/conformance/python-sdk-v03-records") {
  const files = readdirSync(inputDir).filter((file) => file.endsWith(".json")).sort();
  return files.map((file) => ({ file, record: JSON.parse(readFileSync(join(inputDir, file), "utf8")) }));
}

export function validatePythonSdkBridgeRecords(inputDir = "tests/conformance/python-sdk-v03-records") {
  return loadPythonSdkBridgeRecords(inputDir).map(({ file, record }) => ({ file, ...validatePythonSdkBridgeRecord(record) }));
}

export function writePythonSdkBridgeReport({ inputDir = "tests/conformance/python-sdk-v03-records", outputPath = "reports/python-sdk/bridge-report.json" } = {}) {
  const results = validatePythonSdkBridgeRecords(inputDir);
  mkdirSync(outputPath.split("/").slice(0, -1).join("/"), { recursive: true });
  const report = {
    title: "RuleOak Python SDK Bridge Report",
    bridge: PYTHON_SDK_BRIDGE,
    generatedAt: new Date().toISOString(),
    inputDir,
    recordCount: results.length,
    valid: results.every((result) => result.valid),
    records: results.map((result) => ({
      file: basename(result.file),
      recordType: result.recordType,
      schemaVersion: result.schemaVersion,
      valid: result.valid
    }))
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return report;
}
