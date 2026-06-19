#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildApprovalAuditProductSurface } from "../../src/product-surface/index.js";

const root = process.cwd();
const outDir = join(root, "examples", "approval-audit-product-surface", "out");
mkdirSync(outDir, { recursive: true });

const generators = [
  ["examples/ai-coding-agent-governance/run.js"],
  ["examples/enterprise-rag-answer-governance/run.js"],
  ["examples/sre-monitoring-change-governance/run.js"]
];
for (const [script] of generators) execFileSync(process.execPath, [join(root, script)], { stdio: "pipe" });

const result = buildApprovalAuditProductSurface({ root, outputDir: outDir });
writeFileSync(join(outDir, "summary.json"), `${JSON.stringify({ schema: "ruleoak.approval_audit_product_surface_example.v1", latestPublicCoreRelease: "v2.1.0", indexPath: result.indexPath, dashboardPath: result.dashboardPath, packetPath: result.packetPath, reportCount: result.reportCount, approvalCount: result.approvalCount }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, release: "v2.1.0", productSurface: result.indexPath, dashboard: result.dashboardPath, approvals: result.approvalCount, reports: result.reportCount }, null, 2));
