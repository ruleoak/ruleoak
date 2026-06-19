import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildReportCatalog } from "../src/reports/index.js";

mkdirSync("tests/tmp/report-snapshot", { recursive: true });
const reportPath = "tests/tmp/report-snapshot/sample-report.json";
writeFileSync(reportPath, JSON.stringify({
  runtimeVersion: "2.6.0",
  run: { id: "run-snapshot", app: "Snapshot", status: "completed" },
  summary: { title: "Snapshot report", policyDecision: "allowed" },
  evidence: [{ id: "e1" }],
  auditEvents: [{ id: "a1" }],
  approvals: []
}, null, 2));
const expected = JSON.parse(readFileSync("tests/fixtures/reports/report-snapshot-minimum.json", "utf8"));
const catalog = buildReportCatalog([reportPath]);
assert.equal(catalog.schema, expected.requiredCatalogSchema);
assert.ok(catalog.reportCount >= expected.minimumReportCount);
const report = catalog.reports[0];
for (const field of expected.requiredSummaryFields) assert.ok(Object.hasOwn(report, field), `${field} should exist`);
assert.equal(report.counts.evidence, 1);
assert.equal(report.counts.auditEvents, 1);
console.log("report-snapshot tests passed");
