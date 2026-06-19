import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApprovalAuditProductSurface, createApprovalAuditProductPacket } from "../src/product-surface/index.js";

// Generate a small realistic set of report artifacts first.
execFileSync(process.execPath, [join(process.cwd(), "examples", "ai-coding-agent-governance", "run.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(process.cwd(), "examples", "enterprise-rag-answer-governance", "run.js")], { stdio: "pipe" });
execFileSync(process.execPath, [join(process.cwd(), "examples", "sre-monitoring-change-governance", "run.js")], { stdio: "pipe" });

const dir = mkdtempSync(join(tmpdir(), "ruleoak-product-surface-"));
const result = buildApprovalAuditProductSurface({ root: process.cwd(), outputDir: dir });
assert.ok(existsSync(result.indexPath));
assert.ok(existsSync(result.dashboardPath));
assert.ok(existsSync(result.packetPath));
assert.ok(existsSync(result.approvalStatePath));
assert.ok(existsSync(result.auditCatalogPath));
assert.ok(result.reportCount >= 3, "expected reports from reference verticals");
assert.ok(result.approvalCount >= 1, "expected approval requests from reference verticals");
assert.equal(result.surface.schema, "ruleoak.approval_audit_product_surface.v1");
assert.equal(result.surface.latestPublicCoreRelease, "v2.1.0");
assert.ok(result.surface.actions.requestEvidence.includes("approval:request-evidence"));
assert.ok(result.surface.summary.audit.verification);
assert.ok(result.surface.summary.packets.count >= result.approvalCount);

const html = readFileSync(result.indexPath, "utf8");
assert.ok(html.includes("Approval and Audit Product Surface"));
assert.ok(html.includes("Open approval inbox"));
assert.ok(html.includes("Open audit viewer"));
assert.ok(html.includes("request-evidence"));

const dashboard = JSON.parse(readFileSync(result.dashboardPath, "utf8"));
assert.equal(dashboard.schema, "ruleoak.approval_audit_product_surface.v1");
assert.ok(dashboard.paths.packet.endsWith("approval-audit-packet.zip"));
assert.ok(dashboard.integrity.dashboardHash.length === 64);

const packet = createApprovalAuditProductPacket({ root: process.cwd(), outputDir: dir, packetPath: join(dir, "manual-packet.zip") });
assert.ok(existsSync(packet));
assert.ok(readFileSync(packet).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

const cliOut = execFileSync(process.execPath, [join(process.cwd(), "scripts", "approval-audit-product-surface.js"), "check", `--out=${join(dir, "cli")}`], { encoding: "utf8" });
const cliJson = JSON.parse(cliOut);
assert.equal(cliJson.ok, true);
assert.ok(cliJson.approvalCount >= 1);

execFileSync(process.execPath, [join(process.cwd(), "examples", "approval-audit-product-surface", "run.js")], { stdio: "pipe" });
assert.ok(existsSync(join(process.cwd(), "examples", "approval-audit-product-surface", "out", "summary.json")));

console.log("approval and audit product surface tests passed");
