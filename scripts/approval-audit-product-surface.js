#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildApprovalAuditProductSurface, createApprovalAuditProductPacket, serveApprovalAuditProductSurface } from "../src/product-surface/index.js";

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const [command = "build"] = process.argv.slice(2);
const root = resolve(arg("root", process.cwd()));
const outputDir = resolve(arg("out", join(root, "reports", "approval-audit-surface")));

try {
  if (command === "build") {
    const result = buildApprovalAuditProductSurface({ root, outputDir });
    console.log(JSON.stringify({ ok: true, command, indexPath: result.indexPath, dashboardPath: result.dashboardPath, packetPath: result.packetPath, reportCount: result.reportCount, approvalCount: result.approvalCount }, null, 2));
  } else if (command === "check") {
    const result = buildApprovalAuditProductSurface({ root, outputDir });
    const required = [result.indexPath, result.dashboardPath, result.packetPath, result.approvalStatePath, result.auditCatalogPath];
    const missing = required.filter((path) => !existsSync(path));
    if (missing.length) throw new Error(`Product surface output missing: ${missing.join(", ")}`);
    if (result.reportCount < 1) throw new Error("Product surface requires at least one audit report.");
    if (result.approvalCount < 1) throw new Error("Product surface requires at least one approval request.");
    console.log(JSON.stringify({ ok: true, command, checked: required.length, reportCount: result.reportCount, approvalCount: result.approvalCount, outputDir }, null, 2));
  } else if (command === "packet") {
    const packetPath = createApprovalAuditProductPacket({ root, outputDir, packetPath: resolve(arg("packet", join(outputDir, "approval-audit-packet.zip"))) });
    console.log(JSON.stringify({ ok: true, command, packetPath }, null, 2));
  } else if (command === "serve") {
    const port = Number(arg("port", 8790));
    const result = await serveApprovalAuditProductSurface({ root, outputDir, port });
    console.log(JSON.stringify({ ok: true, command, url: result.url, outputDir: result.outputDir }, null, 2));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, command, error: error.message }, null, 2));
  process.exit(1);
}
