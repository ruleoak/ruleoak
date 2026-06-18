import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateGovernanceRecord, stableJson, createEvidenceRecord } from "../src/protocol/index.js";

const goldenDir = "tests/conformance/golden-records";
const files = readdirSync(goldenDir).filter((f) => f.endsWith(".json"));
assert.equal(files.length, 6, "expected six golden governance records");
for (const file of files) {
  const record = JSON.parse(readFileSync(join(goldenDir, file), "utf8"));
  const result = validateGovernanceRecord(record);
  assert.equal(result.valid, true, `${file} should validate`);
}
assert.throws(() => validateGovernanceRecord({ recordType: "RunRecord" }), /schemaVersion|runId|required/);
const a = stableJson({ b: 1, a: { d: 2, c: 3 } });
const b = stableJson({ a: { c: 3, d: 2 }, b: 1 });
assert.equal(a, b, "stableJson should be deterministic");
const ev1 = createEvidenceRecord({ evidenceId: "E1", runId: "R1", action: "read", subject: "doc", createdAt: "2026-01-01T00:00:00.000Z", metadata: { z: 1, a: 2 } });
const ev2 = createEvidenceRecord({ evidenceId: "E1", runId: "R1", action: "read", subject: "doc", createdAt: "2026-01-01T00:00:00.000Z", metadata: { a: 2, z: 1 } });
assert.equal(ev1.hash, ev2.hash, "evidence hash should be deterministic");
console.log("protocol conformance test passed");
