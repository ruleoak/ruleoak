import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAuditViewerCatalog, buildAuditViewerV2, compareAuditReports, createAuditPacket, discoverReportPaths } from "../src/reports/index.js";

const sampleReports = [
  join(process.cwd(), "examples", "ai-coding-agent-governance", "out", "ai-coding-agent-governance-report.json"),
  join(process.cwd(), "examples", "enterprise-rag-answer-governance", "out", "enterprise-rag-answer-governance-report.json"),
  join(process.cwd(), "examples", "sre-monitoring-change-governance", "out", "sre-monitoring-change-report.json")
].filter(existsSync);

assert.ok(sampleReports.length >= 2, "expected at least two reference reports");
const catalog = buildAuditViewerCatalog(sampleReports, { root: process.cwd() });
assert.equal(catalog.schema, "ruleoak.audit_report_viewer.v2");
assert.equal(catalog.latestPublicCoreRelease, "v2.1.0");
assert.equal(catalog.reportCount, sampleReports.length);
assert.ok(catalog.filters.policyDecisions.length > 0);
assert.ok(catalog.reports[0].reportHash.length === 64);
assert.ok(catalog.reports.some((report) => report.verification.evidenceBundle.available));

const dir = mkdtempSync(join(tmpdir(), "ruleoak-audit-viewer-v2-"));
const result = buildAuditViewerV2({ root: process.cwd(), outputDir: dir, reportPaths: sampleReports });
assert.equal(result.reportCount, sampleReports.length);
assert.ok(existsSync(join(dir, "index.html")));
assert.ok(existsSync(join(dir, "catalog.json")));
assert.ok(existsSync(join(dir, "compare-runs.json")));
const generatedCatalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"));
assert.equal(generatedCatalog.schema, "ruleoak.audit_report_viewer.v2");
for (const report of generatedCatalog.reports) {
  assert.ok(existsSync(join(dir, "reports", `${report.slug}.html`)));
  assert.ok(existsSync(join(dir, "packets", `${report.slug}.zip`)));
}

const packet = createAuditPacket(sampleReports[0], join(dir, "single-packet.zip"), { root: process.cwd() });
assert.ok(existsSync(packet.path));
assert.equal(packet.manifest.schema, "ruleoak.audit_packet.v1");
assert.ok(packet.entryCount >= 2);
assert.ok(readFileSync(packet.path).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

const comparison = compareAuditReports(sampleReports[0], sampleReports[1], { root: process.cwd() });
assert.equal(comparison.schema, "ruleoak.audit_report_compare.v1");
assert.ok(Object.hasOwn(comparison.delta, "evidence"));
assert.ok(comparison.left.reportHash.length === 64);

const discovered = discoverReportPaths(process.cwd());
assert.ok(discovered.length >= sampleReports.length);

execFileSync(process.execPath, [join(process.cwd(), "scripts", "audit-viewer-v2.js"), "check", `--out=${join(dir, "cli")}`], { stdio: "pipe" });
assert.ok(existsSync(join(dir, "cli", "index.html")));

console.log("audit viewer v2 tests passed");
