import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  canonicalJson,
  recordHash,
  validateGovernanceRecord,
  verifyAuditEventChain,
  verifyEvidenceBundle,
  GOVERNANCE_SCHEMA_VERSION
} from "./index.js";

export const PROTOCOL_CONFORMANCE_KIT = Object.freeze({
  name: "ruleoak-protocol-conformance-kit",
  kitVersion: "1.0.0",
  protocol: GOVERNANCE_SCHEMA_VERSION,
  latestPublicCoreRelease: "v2.1.0",
  status: "RuleOak Core v2.1.0 release / future release work"
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function walkJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) return walkJson(path);
      return name.endsWith(".json") ? [path] : [];
    })
    .sort();
}

function recordId(record) {
  if (record.recordType === "RunRecord") return record.runId || null;
  if (record.recordType === "EvidenceRecord") return record.evidenceId || null;
  if (record.recordType === "PolicyDecisionRecord") return record.decisionId || null;
  if (record.recordType === "ApprovalRecord") return record.approvalId || null;
  if (record.recordType === "AuditEvent") return record.eventId || null;
  if (record.recordType === "ReportRecord") return record.reportId || null;
  return record.runId || record.evidenceId || record.decisionId || record.approvalId || record.eventId || record.reportId || null;
}

function assertCompat(condition, message, errors) {
  if (!condition) errors.push(message);
}

function checkManifest(kitRoot, errors) {
  const manifestPath = join(kitRoot, "conformance-manifest.json");
  assertCompat(existsSync(manifestPath), "missing conformance-manifest.json", errors);
  if (!existsSync(manifestPath)) return null;
  const manifest = readJson(manifestPath);
  assertCompat(manifest.kit === PROTOCOL_CONFORMANCE_KIT.name, "manifest.kit mismatch", errors);
  assertCompat(manifest.protocol === GOVERNANCE_SCHEMA_VERSION, `manifest.protocol must be ${GOVERNANCE_SCHEMA_VERSION}`, errors);
  assertCompat(manifest.latestPublicCoreRelease === "v2.1.0", "manifest must keep latest public Core release at v2.1.0", errors);
  assertCompat(Array.isArray(manifest.requiredChecks) && manifest.requiredChecks.length >= 5, "manifest.requiredChecks is incomplete", errors);
  return manifest;
}

function checkGoldenRecords(kitRoot, manifest, errors) {
  const files = walkJson(join(kitRoot, "fixtures", "golden-records"));
  assertCompat(files.length >= 6, "golden-records must include the six governance record types", errors);
  const observed = [];
  for (const file of files) {
    const record = readJson(file);
    try {
      validateGovernanceRecord(record);
      const id = recordId(record);
      const hash = recordHash(record);
      observed.push({ recordType: record.recordType, id, hash });
      const manifestEntry = (manifest?.goldenRecords || []).find((entry) => entry.id === id);
      if (manifestEntry) assertCompat(manifestEntry.expectedHash === hash, `manifest hash mismatch for ${record.recordType}:${id}`, errors);
    } catch (error) {
      errors.push(`golden record ${file} failed validation: ${error.message}`);
    }
  }
  const types = new Set(observed.map((entry) => entry.recordType));
  for (const type of ["RunRecord", "EvidenceRecord", "PolicyDecisionRecord", "ApprovalRecord", "AuditEvent", "ReportRecord"]) {
    assertCompat(types.has(type), `missing golden record type ${type}`, errors);
  }
  return observed;
}

function checkValidFixtures(kitRoot, errors) {
  const bundlePath = join(kitRoot, "fixtures", "valid", "evidence-bundle.json");
  const auditLogPath = join(kitRoot, "fixtures", "valid", "audit-log.json");
  const envelopePath = join(kitRoot, "fixtures", "valid", "protocol-envelope.json");
  const redactionPath = join(kitRoot, "fixtures", "valid", "redaction-manifest.json");
  assertCompat(existsSync(bundlePath), "missing valid evidence bundle fixture", errors);
  assertCompat(existsSync(auditLogPath), "missing valid audit log fixture", errors);
  if (existsSync(bundlePath)) {
    const result = verifyEvidenceBundle(readJson(bundlePath));
    assertCompat(result.valid, `valid evidence bundle failed replay: ${result.errors.join("; ")}`, errors);
  }
  if (existsSync(auditLogPath)) {
    const result = verifyAuditEventChain(readJson(auditLogPath));
    assertCompat(result.valid, `valid audit log failed replay: ${result.errors.join("; ")}`, errors);
  }
  if (existsSync(envelopePath)) {
    const envelope = readJson(envelopePath);
    assertCompat(envelope.protocol === GOVERNANCE_SCHEMA_VERSION, "protocol envelope has invalid protocol", errors);
    assertCompat(envelope.kind === envelope.record?.recordType, "protocol envelope kind must match recordType", errors);
    try {
      validateGovernanceRecord(envelope.record);
    } catch (error) {
      errors.push(`protocol envelope record failed validation: ${error.message}`);
    }
  }
  if (existsSync(redactionPath)) {
    const redaction = readJson(redactionPath);
    assertCompat(redaction.protocol === GOVERNANCE_SCHEMA_VERSION, "redaction manifest protocol mismatch", errors);
    assertCompat(redaction.manifestType === "RuleOakRedactionManifest", "redaction manifest type mismatch", errors);
    assertCompat(Array.isArray(redaction.fields), "redaction manifest fields must be an array", errors);
  }
}

function checkInvalidFixtures(kitRoot, errors) {
  const invalidRecordFiles = walkJson(join(kitRoot, "fixtures", "invalid-records"));
  assertCompat(invalidRecordFiles.length >= 4, "invalid-records must include rejection fixtures", errors);
  for (const file of invalidRecordFiles) {
    let failed = false;
    try {
      validateGovernanceRecord(readJson(file));
    } catch {
      failed = true;
    }
    assertCompat(failed, `invalid record fixture was accepted: ${file}`, errors);
  }
  const invalidBundleFiles = walkJson(join(kitRoot, "fixtures", "invalid-bundles"));
  assertCompat(invalidBundleFiles.length >= 2, "invalid-bundles must include replay rejection fixtures", errors);
  for (const file of invalidBundleFiles) {
    const payload = readJson(file);
    const result = Array.isArray(payload) ? verifyAuditEventChain(payload) : verifyEvidenceBundle(payload);
    assertCompat(!result.valid, `invalid replay fixture was accepted: ${file}`, errors);
  }
}

function checkHashTests(kitRoot, errors) {
  const files = walkJson(join(kitRoot, "fixtures", "hash-tests"));
  assertCompat(files.length >= 2, "hash-tests must include deterministic fixtures", errors);
  for (const file of files) {
    const test = readJson(file);
    if (test.inputA && test.inputB) {
      assertCompat(canonicalJson(test.inputA) === canonicalJson(test.inputB), `canonical JSON mismatch for ${test.name}`, errors);
      assertCompat(canonicalJson(test.inputA) === test.expectedCanonicalJson, `expected canonical JSON mismatch for ${test.name}`, errors);
      assertCompat(recordHash(test.inputA) === test.expectedHash, `expected hash mismatch for ${test.name}`, errors);
      assertCompat(recordHash(test.inputB) === test.expectedHash, `inputB hash mismatch for ${test.name}`, errors);
    } else if (test.record) {
      assertCompat(canonicalJson(test.record) === test.expectedCanonicalJson, `expected canonical JSON mismatch for ${test.name}`, errors);
      assertCompat(recordHash(test.record) === test.expectedHash, `expected record hash mismatch for ${test.name}`, errors);
    } else {
      errors.push(`hash test ${file} is missing inputA/inputB or record`);
    }
  }
}

function checkBadges(kitRoot, errors) {
  for (const badge of ["governance-v1-compatible.svg", "evidence-bundle-v1-compatible.svg", "policy-pack-v1-compatible.svg"]) {
    const file = join(kitRoot, "badges", badge);
    assertCompat(existsSync(file), `missing badge ${badge}`, errors);
    if (existsSync(file)) {
      const text = readFileSync(file, "utf8");
      assertCompat(text.includes("compatible"), `badge ${badge} must say compatible`, errors);
    }
  }
}

export function runProtocolConformanceKit({ kitRoot = resolve("protocol-conformance-kit") } = {}) {
  const errors = [];
  const resolvedKitRoot = resolve(kitRoot);
  assertCompat(existsSync(resolvedKitRoot), `kit root does not exist: ${resolvedKitRoot}`, errors);
  if (!existsSync(resolvedKitRoot)) return { valid: false, errors, kitRoot: resolvedKitRoot };
  const manifest = checkManifest(resolvedKitRoot, errors);
  const observedGoldenRecords = checkGoldenRecords(resolvedKitRoot, manifest, errors);
  checkValidFixtures(resolvedKitRoot, errors);
  checkInvalidFixtures(resolvedKitRoot, errors);
  checkHashTests(resolvedKitRoot, errors);
  checkBadges(resolvedKitRoot, errors);
  return {
    valid: errors.length === 0,
    errors,
    kitRoot: resolvedKitRoot,
    protocol: GOVERNANCE_SCHEMA_VERSION,
    kitVersion: manifest?.kitVersion || PROTOCOL_CONFORMANCE_KIT.kitVersion,
    latestPublicCoreRelease: manifest?.latestPublicCoreRelease || "v2.1.0",
    goldenRecordCount: observedGoldenRecords.length,
    checks: manifest?.requiredChecks || []
  };
}
