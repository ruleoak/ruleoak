import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { verifyEvidenceBundle } from "../protocol/evidence-bundle.js";
import { verifyAuditEventChain } from "../protocol/audit-log.js";
import { recordHash } from "../protocol/record-factory.js";
import { stableJson } from "../protocol/stable-json.js";
import { summarizeReport } from "./report-catalog.js";
import { renderReport } from "./html-report.js";

const VIEWER_SCHEMA = "ruleoak.audit_report_viewer.v2";
const PACKET_SCHEMA = "ruleoak.audit_packet.v1";

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function hashAny(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function normalizeSlug(value) {
  return String(value || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}

function pathIfExists(...parts) {
  const p = join(...parts);
  return existsSync(p) ? p : null;
}

function findAdjacentArtifacts(reportPath) {
  const dir = dirname(reportPath);
  return {
    evidenceBundlePath: pathIfExists(dir, "evidence-bundle.json"),
    auditLogPath: pathIfExists(dir, "audit-log.json"),
    approvalRequestPath: pathIfExists(dir, "approval-request.json"),
    governanceRecordsPath: pathIfExists(dir, "governance-records.json"),
    raciPath: pathIfExists(dir, "raci.json")
  };
}

function summarizeApprovals(report) {
  const approvals = Array.isArray(report.approvals) ? report.approvals : [];
  const toolDecisions = Array.isArray(report.toolDecisions) ? report.toolDecisions : Array.isArray(report.policyDecisions) ? report.policyDecisions : [];
  const required = toolDecisions.filter((decision) => decision.approvalRequired || decision.decision === "approval_required" || decision.decision === "requires_approval").length;
  return {
    total: approvals.length,
    approvalRequired: required,
    approved: approvals.filter((a) => a.status === "approved" || a.decision === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected" || a.decision === "rejected").length,
    pending: approvals.filter((a) => a.status === "pending").length
  };
}

function collectPolicyPacks(report) {
  const packs = [];
  if (report.policyPack) packs.push(report.policyPack);
  if (report.summary?.policyPack) packs.push(report.summary.policyPack);
  for (const decision of report.toolDecisions || report.policyDecisions || []) {
    if (decision.policyPack) packs.push(decision.policyPack);
    if (decision.packId) packs.push(decision.packId);
  }
  return unique(packs);
}

function summarizeEvidence(report) {
  const evidence = Array.isArray(report.evidence) ? report.evidence : [];
  const sources = evidence.map((item) => item.source || item.connector || item.type || item.recordType || item.evidenceType);
  return { total: evidence.length, sources: unique(sources) };
}

function summarizeDecisions(report) {
  const decisions = report.toolDecisions || report.policyDecisions || [];
  const values = decisions.map((item) => item.decision || item.policyDecision || item.status);
  return {
    total: Array.isArray(decisions) ? decisions.length : 0,
    values: unique(values),
    blocked: values.filter((v) => v === "blocked" || v === "deny" || v === "denied").length,
    approvalRequired: values.filter((v) => v === "approval_required" || v === "requires_approval").length,
    allowed: values.filter((v) => v === "allowed" || v === "allow").length
  };
}

function verificationForArtifact(path, type) {
  if (!path) return { available: false, valid: null, errors: [], type };
  try {
    const value = readJson(path);
    if (type === "evidence_bundle") return { available: true, type, path, ...verifyEvidenceBundle(value) };
    if (type === "audit_chain") return { available: true, type, path, ...verifyAuditEventChain(value) };
    return { available: true, type, path, valid: true, errors: [] };
  } catch (error) {
    return { available: true, type, path, valid: false, errors: [error.message] };
  }
}

function relativeOrNull(root, path) {
  return path ? relative(root, path).replaceAll("\\", "/") : null;
}

export function summarizeAuditReportV2(report, sourcePath, options = {}) {
  const root = resolve(options.root || process.cwd());
  const artifacts = findAdjacentArtifacts(sourcePath);
  const base = summarizeReport(report, sourcePath);
  const evidence = summarizeEvidence(report);
  const decisions = summarizeDecisions(report);
  const approval = summarizeApprovals(report);
  const policyPacks = collectPolicyPacks(report);
  const slug = normalizeSlug(`${base.id}-${basename(sourcePath, ".json")}`);
  const evidenceVerification = verificationForArtifact(artifacts.evidenceBundlePath, "evidence_bundle");
  const auditVerification = verificationForArtifact(artifacts.auditLogPath, "audit_chain");
  const reportHash = recordHash(report);
  return {
    ...base,
    schema: VIEWER_SCHEMA,
    slug,
    reportHash,
    sourcePath: relativeOrNull(root, sourcePath),
    sourceAbsolutePath: sourcePath,
    evidence,
    decisions,
    approval,
    policyPacks,
    artifacts: Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, relativeOrNull(root, value)])),
    verification: {
      reportHash,
      evidenceBundle: { ...evidenceVerification, path: relativeOrNull(root, evidenceVerification.path) },
      auditChain: { ...auditVerification, path: relativeOrNull(root, auditVerification.path) }
    }
  };
}

export function buildAuditViewerCatalog(reportPaths = [], options = {}) {
  const root = resolve(options.root || process.cwd());
  const reports = reportPaths.filter(Boolean).filter(existsSync).map((path) => summarizeAuditReportV2(readJson(path), resolve(path), { root }));
  return {
    schema: VIEWER_SCHEMA,
    generatedAt: new Date().toISOString(),
    latestPublicCoreRelease: "v2.1.0",
    developmentStatus: "RuleOak Core v2.1.0",
    reportCount: reports.length,
    filters: {
      apps: unique(reports.map((report) => report.app)),
      statuses: unique(reports.map((report) => report.status)),
      policyDecisions: unique(reports.flatMap((report) => [report.policyDecision, ...report.decisions.values])),
      policyPacks: unique(reports.flatMap((report) => report.policyPacks)),
      approvalStates: unique(reports.flatMap((report) => [report.approval.pending ? "pending" : null, report.approval.approved ? "approved" : null, report.approval.rejected ? "rejected" : null])),
      verificationStates: unique(reports.flatMap((report) => [report.verification.evidenceBundle.valid === true ? "evidence-valid" : report.verification.evidenceBundle.valid === false ? "evidence-invalid" : null, report.verification.auditChain.valid === true ? "audit-valid" : report.verification.auditChain.valid === false ? "audit-invalid" : null]))
    },
    reports
  };
}

function renderStatus(value) {
  const text = value === true ? "valid" : value === false ? "invalid" : "not available";
  return `<span class="pill">${esc(text)}</span>`;
}

function renderReportCard(report) {
  return `<article class="card report-card" data-app="${esc(report.app)}" data-status="${esc(report.status)}" data-policy="${esc([report.policyDecision, ...report.decisions.values].join(" "))}" data-approval="${esc(report.approval.pending ? "pending" : report.approval.approved ? "approved" : report.approval.rejected ? "rejected" : "none")}">
    <h3><a href="./reports/${esc(report.slug)}.html">${esc(report.title)}</a></h3>
    <p class="muted"><code>${esc(report.sourcePath)}</code></p>
    <div class="badges"><span>${esc(report.status)}</span><span>${esc(report.policyDecision)}</span><span>${esc(report.app)}</span></div>
    <dl class="metrics"><div><dt>Evidence</dt><dd>${report.evidence.total}</dd></div><div><dt>Decisions</dt><dd>${report.decisions.total}</dd></div><div><dt>Approvals</dt><dd>${report.approval.total || report.approval.approvalRequired}</dd></div><div><dt>Audit</dt><dd>${report.counts.auditEvents}</dd></div></dl>
    <p>Evidence bundle: ${renderStatus(report.verification.evidenceBundle.valid)} · Audit chain: ${renderStatus(report.verification.auditChain.valid)}</p>
    <p><a href="./packets/${esc(report.slug)}.zip">Download audit packet</a> · <a href="./reports/${esc(report.slug)}.html#redaction">Redaction view</a></p>
  </article>`;
}

function renderViewerIndex(catalog) {
  const options = (name, values) => `<label>${esc(name)} <select data-filter="${esc(name.toLowerCase())}"><option value="">All</option>${values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Audit Report Viewer v2</title><style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#08111f;color:#eef5ff;margin:0;padding:36px;line-height:1.5}.shell{max-width:1180px;margin:0 auto}.card{background:#0d1b2e;border:1px solid #28405f;border-radius:18px;padding:22px;margin:16px 0}a{color:#f1c66d}.muted{color:#a9bad0}code{background:#14243a;padding:2px 6px;border-radius:6px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.badges span,.pill{display:inline-block;border:1px solid #d6b56d;color:#ffe3a3;border-radius:999px;padding:3px 9px;margin:3px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.metrics div{border:1px solid #28405f;border-radius:12px;padding:8px}.metrics dt{font-size:12px;color:#a9bad0}.metrics dd{font-size:22px;margin:0}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.toolbar input,.toolbar select{background:#0d1b2e;color:#eef5ff;border:1px solid #28405f;border-radius:10px;padding:8px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #28405f;padding:9px;text-align:left}
  </style></head><body><main class="shell"><h1>RuleOak Audit Report Viewer v2</h1><p class="muted">Local static viewer for evidence-backed reports, verification state, approval status, redaction manifests, audit packets, and report comparison. Latest public Core release: <strong>v2.1.0</strong>..</p><section class="card toolbar"><input data-filter="search" placeholder="Search reports, apps, decisions...">${options("App", catalog.filters.apps)}${options("Status", catalog.filters.statuses)}${options("Policy", catalog.filters.policyDecisions)}<a href="./catalog.json">catalog.json</a><a href="./compare-runs.json">compare-runs.json</a></section><section class="grid" id="reports">${catalog.reports.map(renderReportCard).join("")}</section><script>
    const cards=[...document.querySelectorAll('.report-card')];
    const inputs=[...document.querySelectorAll('[data-filter]')];
    function apply(){const q=(document.querySelector('[data-filter=search]').value||'').toLowerCase(); const app=document.querySelector('[data-filter=app]').value; const status=document.querySelector('[data-filter=status]').value; const policy=document.querySelector('[data-filter=policy]').value; for (const c of cards){const text=c.textContent.toLowerCase(); const ok=(!q||text.includes(q))&&(!app||c.dataset.app===app)&&(!status||c.dataset.status===status)&&(!policy||c.dataset.policy.includes(policy)); c.style.display=ok?'':'none';}}
    inputs.forEach(i=>i.addEventListener('input',apply));
  </script></main></body></html>`;
}

function redactionRows(bundle) {
  const manifest = bundle?.redactionManifest;
  if (!manifest) return "<p>No redaction manifest attached.</p>";
  const fields = manifest.fields || [];
  return `<p>Reason: ${esc(manifest.reason)}</p><table><thead><tr><th>Path</th><th>Method</th><th>Reason</th></tr></thead><tbody>${fields.map((field) => `<tr><td><code>${esc(field.path)}</code></td><td>${esc(field.method)}</td><td>${esc(field.reason)}</td></tr>`).join("")}</tbody></table>`;
}

function artifactTable(title, value) {
  if (!value) return `<section class="card"><h2>${esc(title)}</h2><p>No artifact available.</p></section>`;
  const rows = Object.entries(value).slice(0, 40).map(([k, v]) => `<tr><th>${esc(k)}</th><td><code>${esc(typeof v === "object" ? JSON.stringify(v).slice(0, 240) : v)}</code></td></tr>`).join("");
  return `<section class="card"><h2>${esc(title)}</h2><table>${rows}</table></section>`;
}

function renderEnhancedReportPage(report, summary, artifacts) {
  const base = renderReport(report, { sourcePath: summary.sourcePath });
  const bundle = artifacts.evidenceBundlePath ? readJson(artifacts.evidenceBundlePath) : null;
  const auditLog = artifacts.auditLogPath ? readJson(artifacts.auditLogPath) : null;
  const enhancement = `<section class="card"><h2>Viewer v2 verification</h2><p>Report hash: <code>${esc(summary.reportHash)}</code></p><p>Evidence bundle: ${renderStatus(summary.verification.evidenceBundle.valid)} ${summary.verification.evidenceBundle.bundleHash ? `<code>${esc(summary.verification.evidenceBundle.bundleHash)}</code>` : ""}</p><p>Audit chain: ${renderStatus(summary.verification.auditChain.valid)} ${summary.verification.auditChain.lastHash ? `<code>${esc(summary.verification.auditChain.lastHash)}</code>` : ""}</p><p><a href="../packets/${esc(summary.slug)}.zip">Download audit packet ZIP</a></p></section><section class="card"><h2>Evidence bundle</h2><pre>${esc(JSON.stringify({ bundleId: bundle?.bundleId, runId: bundle?.runId, recordCount: bundle?.records?.length, bundleHash: bundle?.bundleHash }, null, 2))}</pre></section><section class="card"><h2>Audit chain</h2><pre>${esc(JSON.stringify({ eventCount: Array.isArray(auditLog) ? auditLog.length : 0, lastHash: summary.verification.auditChain.lastHash, valid: summary.verification.auditChain.valid }, null, 2))}</pre></section><section class="card" id="redaction"><h2>Redaction view</h2>${redactionRows(bundle)}</section>${artifactTable("Artifacts", summary.artifacts)}`;
  return base.replace("</main></body></html>", `${enhancement}</main></body></html>`);
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}
const CRC32_TABLE = makeCrc32Table();
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

export function writeZipFile(entries, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = entry.name.replace(/^\/+/, "").replaceAll("\\", "/");
    const nameBuf = Buffer.from(name);
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data ?? ""));
    const crc = crc32(data);
    const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBuf.length), u16(0), nameBuf, data]);
    localParts.push(local);
    const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf]);
    centralParts.push(central);
    offset += local.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(central.length), u32(offset), u16(0)]);
  writeFileSync(outputPath, Buffer.concat([...localParts, central, end]));
  return outputPath;
}

export function createAuditPacket(reportPath, outputPath, options = {}) {
  const root = resolve(options.root || process.cwd());
  const absReport = resolve(reportPath);
  const report = readJson(absReport);
  const artifacts = findAdjacentArtifacts(absReport);
  const summary = summarizeAuditReportV2(report, absReport, { root });
  const manifest = {
    schema: PACKET_SCHEMA,
    generatedAt: new Date().toISOString(),
    report: summary,
    files: []
  };
  const candidates = [["report.json", absReport], ["evidence-bundle.json", artifacts.evidenceBundlePath], ["audit-log.json", artifacts.auditLogPath], ["approval-request.json", artifacts.approvalRequestPath], ["governance-records.json", artifacts.governanceRecordsPath], ["raci.json", artifacts.raciPath]];
  const entries = [];
  for (const [name, filePath] of candidates) {
    if (!filePath || !existsSync(filePath)) continue;
    const data = readFileSync(filePath);
    manifest.files.push({ name, sourcePath: relativeOrNull(root, filePath), sha256: hashAny(JSON.parse(data.toString("utf8"))) });
    entries.push({ name, data });
  }
  entries.unshift({ name: "packet-manifest.json", data: `${JSON.stringify(manifest, null, 2)}\n` });
  const packetPath = outputPath || join(root, "reports", "audit-viewer-v2", "packets", `${summary.slug}.zip`);
  writeZipFile(entries, packetPath);
  return { path: packetPath, manifest, entryCount: entries.length };
}

export function compareAuditReports(reportAPath, reportBPath, options = {}) {
  const root = resolve(options.root || process.cwd());
  const a = summarizeAuditReportV2(readJson(resolve(reportAPath)), resolve(reportAPath), { root });
  const b = summarizeAuditReportV2(readJson(resolve(reportBPath)), resolve(reportBPath), { root });
  const delta = {
    evidence: b.evidence.total - a.evidence.total,
    decisions: b.decisions.total - a.decisions.total,
    approvals: b.approval.total - a.approval.total,
    auditEvents: b.counts.auditEvents - a.counts.auditEvents
  };
  return {
    schema: "ruleoak.audit_report_compare.v1",
    generatedAt: new Date().toISOString(),
    left: a,
    right: b,
    delta,
    changed: {
      status: a.status !== b.status,
      policyDecision: a.policyDecision !== b.policyDecision,
      reportHash: a.reportHash !== b.reportHash,
      evidenceSources: JSON.stringify(a.evidence.sources) !== JSON.stringify(b.evidence.sources),
      verification: JSON.stringify(a.verification) !== JSON.stringify(b.verification)
    }
  };
}

export function discoverReportPaths(root = process.cwd()) {
  const results = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) {
        if (["node_modules", ".git", "reports", "dist"].includes(name)) continue;
        walk(p);
      } else if (name.endsWith("report.json") || ["case-report.json", "research-brief-report.json", "ten-minute-governance-report.json"].includes(name)) {
        results.push(p);
      }
    }
  }
  walk(join(root, "examples"));
  walk(join(root, "quickstart"));
  if (existsSync(join(root, "reports", "policy-lab"))) walk(join(root, "reports", "policy-lab"));
  return unique(results).map((p) => resolve(p));
}

export function buildAuditViewerV2(options = {}) {
  const root = resolve(options.root || process.cwd());
  const outDir = resolve(options.outputDir || join(root, "reports", "audit-viewer-v2"));
  const reportPaths = options.reportPaths || discoverReportPaths(root);
  const catalog = buildAuditViewerCatalog(reportPaths, { root });
  mkdirSync(join(outDir, "reports"), { recursive: true });
  mkdirSync(join(outDir, "packets"), { recursive: true });
  for (const summary of catalog.reports) {
    const absReport = summary.sourceAbsolutePath;
    const report = readJson(absReport);
    const artifacts = findAdjacentArtifacts(absReport);
    writeFileSync(join(outDir, "reports", `${summary.slug}.html`), renderEnhancedReportPage(report, summary, artifacts));
    createAuditPacket(absReport, join(outDir, "packets", `${summary.slug}.zip`), { root });
  }
  writeJson(join(outDir, "catalog.json"), catalog);
  const compare = catalog.reports.length >= 2 ? compareAuditReports(catalog.reports[0].sourceAbsolutePath, catalog.reports[1].sourceAbsolutePath, { root }) : { schema: "ruleoak.audit_report_compare.v1", generatedAt: new Date().toISOString(), note: "Need at least two reports to compare." };
  writeJson(join(outDir, "compare-runs.json"), compare);
  writeFileSync(join(outDir, "index.html"), renderViewerIndex(catalog));
  return { outputDir: outDir, catalogPath: join(outDir, "catalog.json"), indexPath: join(outDir, "index.html"), comparePath: join(outDir, "compare-runs.json"), reportCount: catalog.reportCount };
}
