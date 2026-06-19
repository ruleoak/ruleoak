#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildAuditViewerV2, compareAuditReports, createAuditPacket } from "../src/reports/index.js";

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const [cmd = "build", ...positional] = process.argv.slice(2);
const root = resolve(arg("root", process.cwd()));
const out = resolve(arg("out", join(root, "reports", "audit-viewer-v2")));

try {
  if (cmd === "build") {
    const result = buildAuditViewerV2({ root, outputDir: out });
    console.log(JSON.stringify({ ok: true, command: "build", ...result }, null, 2));
  } else if (cmd === "check") {
    const result = buildAuditViewerV2({ root, outputDir: out });
    const ok = result.reportCount > 0 && existsSync(result.indexPath) && existsSync(result.catalogPath) && existsSync(result.comparePath);
    if (!ok) throw new Error("Audit Viewer v2 output is incomplete.");
    console.log(JSON.stringify({ ok: true, checked: result.reportCount, indexPath: result.indexPath }, null, 2));
  } else if (cmd === "packet") {
    const reportPath = positional[0] || arg("report");
    if (!reportPath) throw new Error("Usage: node scripts/audit-viewer-v2.js packet <report.json> [--out=packet.zip]");
    const output = arg("out", join(root, "reports", "audit-viewer-v2", "packets", "audit-packet.zip"));
    const result = createAuditPacket(resolve(reportPath), resolve(output), { root });
    console.log(JSON.stringify({ ok: true, command: "packet", ...result }, null, 2));
  } else if (cmd === "compare") {
    const [left, right] = positional;
    if (!left || !right) throw new Error("Usage: node scripts/audit-viewer-v2.js compare <left-report.json> <right-report.json> [--out=compare.json]");
    const comparison = compareAuditReports(resolve(left), resolve(right), { root });
    const output = arg("out", join(out, "compare-runs.json"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(comparison, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, command: "compare", output }, null, 2));
  } else {
    throw new Error(`Unknown command: ${cmd}`);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
