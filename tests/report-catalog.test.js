import assert from "node:assert/strict";
import { buildReportCatalog, summarizeReport } from "../src/reports/index.js";

const report = { runtimeVersion: "1.5.0", runtimeStage: "test", run: { id: "r1", app: "Test", status: "completed" }, evidence: [{ id: "e1" }], auditEvents: [{ id: "a1" }], toolDecisions: [{ id: "t1" }] };
const summary = summarizeReport(report, "demo.json");
assert.equal(summary.id, "r1");
assert.equal(summary.counts.evidence, 1);
assert.equal(summary.counts.auditEvents, 1);
assert.equal(summary.counts.toolDecisions, 1);
const catalog = buildReportCatalog([]);
assert.equal(catalog.reportCount, 0);
console.log("report catalog tests passed");
