import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  PYTHON_SDK_BRIDGE,
  normalizePythonSdkRecord,
  validatePythonSdkBridgeRecords,
  writePythonSdkBridgeReport
} from "../src/protocol/index.js";

assert.equal(PYTHON_SDK_BRIDGE.minimumVersion, "0.3.0");
assert.equal(PYTHON_SDK_BRIDGE.protocol, "ruleoak.governance.v1");
assert.equal(PYTHON_SDK_BRIDGE.status, "compatible");

const results = validatePythonSdkBridgeRecords();
assert.equal(results.length, 6);
for (const result of results) {
  assert.equal(result.valid, true);
  assert.equal(result.schemaVersion, "ruleoak.governance.v1");
  assert.ok(result.normalized.schemaVersion);
  assert.ok(result.normalized.recordType);
}

const evidence = results.find((r) => r.recordType === "EvidenceRecord").normalized;
assert.ok(evidence.hash, "Evidence envelope without hash should get a normalized hash");
assert.equal(evidence.evidenceId, "py-v03-evidence-001");

const direct = normalizePythonSdkRecord({ protocol: "ruleoak.governance.v1", kind: "RunRecord", run_id: "x", domain: "d", workflow: "w", actor: "a", status: "running", created_at: "2026-01-01T00:00:00.000Z" });
assert.equal(direct.schemaVersion, "ruleoak.governance.v1");
assert.equal(direct.recordType, "RunRecord");
assert.equal(direct.runId, "x");

const report = writePythonSdkBridgeReport({ outputPath: "reports/python-sdk/bridge-report-test.json" });
assert.equal(report.valid, true);
assert.equal(report.recordCount, 6);
assert.ok(existsSync("reports/python-sdk/bridge-report-test.json"));

console.log("python sdk bridge ok: 6 v0.3 envelope records");
