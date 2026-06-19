import assert from "node:assert/strict";
import { validatePythonSdkFixtureRecords, PYTHON_SDK_COMPATIBILITY } from "../src/protocol/index.js";

const results = validatePythonSdkFixtureRecords();

assert.equal(PYTHON_SDK_COMPATIBILITY.sdk, "ruleoak-py");
assert.equal(PYTHON_SDK_COMPATIBILITY.protocol, "ruleoak.governance.v1");
assert.ok(results.length >= 6, "expected Python SDK fixture records");

for (const result of results) {
  assert.equal(result.valid, true);
  assert.equal(result.protocol, "ruleoak.governance.v1");
  assert.ok(result.recordType.endsWith("Record") || result.recordType === "AuditEvent");
}

console.log(`python sdk conformance ok: ${results.length} records`);
