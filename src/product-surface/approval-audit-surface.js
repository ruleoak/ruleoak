import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { ApprovalInboxStore, renderApprovalInboxHtml } from "../approval/index.js";
import { buildAuditViewerV2, discoverReportPaths, writeZipFile } from "../reports/index.js";

export const APPROVAL_AUDIT_SURFACE_SCHEMA = "ruleoak.approval_audit_product_surface.v1";

function now() { return new Date().toISOString(); }
function esc(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function jsonHash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function ensureDir(path) { mkdirSync(path, { recursive: true }); return path; }
function writeJson(path, value) { ensureDir(dirname(path)); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); return path; }
function readJsonIfExists(path, fallback = null) { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback; }
function rel(root, path) { return path ? relative(root, path).replaceAll("\\", "/") : null; }

function summarizeApprovalState(store) {
  const summary = store.summary();
  return {
    schema: "ruleoak.approval_surface_summary.v1",
    ...summary,
    open: summary.pending + summary.evidenceRequested,
    highOrCritical: (summary.risks.high || 0) + (summary.risks.critical || 0),
    states: {
      pending: summary.pending,
      evidence_requested: summary.evidenceRequested,
      approved: summary.approved,
      rejected: summary.rejected,
      overdue: summary.overdue
    }
  };
}

function summarizeAuditCatalog(catalog) {
  const verification = catalog.reports.reduce((acc, report) => {
    const evidence = report.verification?.evidenceBundle;
    const audit = report.verification?.auditChain;
    if (evidence?.valid === true) acc.evidenceBundleValid += 1;
    if (audit?.valid === true) acc.auditChainValid += 1;
    if (evidence?.valid === false || audit?.valid === false) acc.invalid += 1;
    return acc;
  }, { evidenceBundleValid: 0, auditChainValid: 0, invalid: 0 });
  return {
    schema: "ruleoak.audit_surface_summary.v1",
    reportCount: catalog.reportCount,
    apps: catalog.filters?.apps || [],
    policyDecisions: catalog.filters?.policyDecisions || [],
    policyPacks: catalog.filters?.policyPacks || [],
    verification
  };
}

function renderProductSurfaceHtml(surface) {
  const approvalCards = surface.approvals.requests.slice(0, 24).map((r) => `<article class="mini-card" data-status="${esc(r.status)}" data-risk="${esc(r.risk)}"><p class="eyebrow">${esc(r.risk)} · ${esc(r.status)}</p><h3>${esc(r.action)}</h3><p>${esc(r.subject || "No subject")}</p><p class="muted">Reviewer: ${esc(r.reviewer || "Unassigned")} · SLA: ${esc(r.slaDueAt || "not set")}</p></article>`).join("");
  const reportCards = surface.audit.reports.slice(0, 24).map((r) => {
    const sourcePath = String(r.sourcePath || "").trimStart();
    return `<article class="mini-card" data-status="${esc(r.status)}"><p class="eyebrow">${esc(r.app)} · ${esc(r.policyDecision)}</p><h3>${esc(r.title)}</h3><p class="path-line"><code>${esc(sourcePath)}</code></p><p class="muted">Evidence: ${esc(r.verification.evidenceBundle.valid === true ? "valid" : r.verification.evidenceBundle.available ? "available" : "not available")} · Audit: ${esc(r.verification.auditChain.valid === true ? "valid" : r.verification.auditChain.available ? "available" : "not available")}</p></article>`;
  }).join("");
  const cliCommands = [
    "npm run product:surface:build",
    "npm run product:surface:serve",
    "npm run product:surface:packet",
    "npm run approval:approve -- <approval-id>",
    "npm run approval:request-evidence -- <approval-id> \"business justification\""
  ].join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Approval and Audit Product Surface</title><style>
  :root{--bg:#f7faf7;--panel:#fff;--text:#17212b;--muted:#5f6f7d;--line:#d9e4dc;--green:#115d3b;--gold:#c19025;--blue:#2454a6;--red:#9f1d1d;--shadow:0 18px 42px rgba(19,32,45,.08)}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#fbfdfa,#eef6ef);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55}.shell{max-width:1200px;margin:0 auto;padding:36px 22px 72px}.hero,.card,.mini-card{background:rgba(255,255,255,.96);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:24px;padding:24px}.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center}.eyebrow{color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:12px}h1{font-size:clamp(38px,6vw,64px);line-height:1;margin:.15em 0;letter-spacing:-.04em}h2{font-size:28px;margin:0 0 8px}.lede{font-size:20px;color:#31404f}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:18px 0}.metric strong{font-size:36px;display:block}.muted{color:var(--muted)}a{color:var(--green);font-weight:800}.button{display:inline-block;background:var(--green);color:#fff;text-decoration:none;padding:12px 16px;border-radius:999px;margin:6px 8px 6px 0}.button.secondary{background:#eef5ef;color:var(--green);border:1px solid var(--line)}.mini-card h3{margin:.1em 0}.toolbar{display:flex;flex-wrap:wrap;gap:10px}.toolbar input{padding:10px 12px;border-radius:999px;border:1px solid var(--line);min-width:260px}.status{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef5ef;margin:4px}.warning{background:#fff5d8;color:#8a5b00}.bad{background:#ffe3e3;color:var(--red)}.ok{background:#e3f6eb;color:var(--green)}code{background:#eef3f7;border-radius:6px;padding:2px 5px}.path-line code{display:inline-block;margin-left:0;text-indent:0}.command-block{margin:0;padding:14px;background:#eef3f7;border-radius:12px;overflow:auto}.command-block code{display:block;background:transparent;padding:0;margin:0;text-indent:0;white-space:pre}@media(max-width:850px){.hero{grid-template-columns:1fr}}
  </style></head><body><main class="shell"><section class="hero"><div><p class="eyebrow">RuleOak Core v2.1.0</p><h1>Approval and Audit Product Surface</h1><p class="lede">A local-first product surface for reviewing approval-required AI actions, inspecting evidence-backed reports, verifying audit artifacts, and exporting packets without sending data to a cloud service.</p><p><a class="button" href="./approval/index.html">Open approval inbox</a><a class="button secondary" href="./audit/index.html">Open audit viewer</a><a class="button secondary" href="./dashboard.json">dashboard.json</a><a class="button secondary" href="./approval-audit-packet.zip">Export packet</a></p></div><div class="card"><h2>What it does</h2><p><span class="status ok">local-only</span><span class="status ok">reviewer comments</span><span class="status ok">evidence requests</span><span class="status ok">report search</span><span class="status ok">packet export</span></p><p class="muted">This is a local developer/admin surface. It does not add SSO, RBAC, multi-user state, or hosted retention by itself.</p></div></section><section class="grid"><article class="card metric"><span>Approvals</span><strong>${surface.summary.approvals.total}</strong><p>${surface.summary.approvals.open} open · ${surface.summary.approvals.overdue} overdue</p></article><article class="card metric"><span>Reports</span><strong>${surface.summary.audit.reportCount}</strong><p>${surface.summary.audit.verification.evidenceBundleValid} evidence bundles valid</p></article><article class="card metric"><span>Packets</span><strong>${surface.summary.packets.count}</strong><p>Approval + audit packet export ready</p></article><article class="card metric"><span>Integrity</span><strong>${surface.summary.audit.verification.invalid ? "Check" : "OK"}</strong><p>${surface.summary.audit.verification.invalid} invalid verification states</p></article></section><section class="card"><h2>Review queue</h2><div class="toolbar"><input id="approvalSearch" placeholder="Search approvals..."></div><div class="grid" id="approvalCards">${approvalCards || "<p>No approval requests found. Run a reference example and rebuild.</p>"}</div></section><section class="card"><h2>Audit reports</h2><div class="toolbar"><input id="reportSearch" placeholder="Search reports..."></div><div class="grid" id="reportCards">${reportCards || "<p>No audit reports found. Run a reference example and rebuild.</p>"}</div></section><section class="card"><h2>CLI</h2><pre class="command-block"><code>${esc(cliCommands)}</code></pre></section><script>
  function filter(inputId, containerId){const input=document.getElementById(inputId); const cards=[...document.getElementById(containerId).querySelectorAll('.mini-card')]; input?.addEventListener('input',()=>{const q=input.value.toLowerCase(); cards.forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?'':'none');});}
  filter('approvalSearch','approvalCards'); filter('reportSearch','reportCards');
  </script></main></body></html>`;
}

export function buildApprovalAuditProductSurface(options = {}) {
  const root = resolve(options.root || process.cwd());
  const outputDir = resolve(options.outputDir || join(root, "reports", "approval-audit-surface"));
  const reportPaths = options.reportPaths || discoverReportPaths(root);
  const approvalStatePath = resolve(options.approvalStatePath || join(outputDir, "approval", "approvals.json"));
  const approvalDir = dirname(approvalStatePath);
  const auditDir = resolve(options.auditOutputDir || join(outputDir, "audit"));
  ensureDir(outputDir);
  ensureDir(approvalDir);
  const store = ApprovalInboxStore.fromReports(reportPaths, { path: approvalStatePath });
  const approvalHtmlPath = join(approvalDir, "index.html");
  writeFileSync(approvalHtmlPath, renderApprovalInboxHtml(store.state));
  const decisionLogPath = store.exportDecisionLog(join(approvalDir, "approval-decisions.jsonl"));
  const approvalPackets = [];
  for (const request of store.state.requests.slice(0, 50)) {
    approvalPackets.push(store.exportApprovalPacket(request.id, join(approvalDir, "packets", `${request.id}.approval-packet.json`)).path);
  }
  const auditBuild = buildAuditViewerV2({ root, outputDir: auditDir, reportPaths });
  const auditCatalog = readJsonIfExists(auditBuild.catalogPath, { reports: [], reportCount: 0, filters: {} });
  const approvalSummary = summarizeApprovalState(store);
  const auditSummary = summarizeAuditCatalog(auditCatalog);
  const surface = {
    schema: APPROVAL_AUDIT_SURFACE_SCHEMA,
    generatedAt: now(),
    latestPublicCoreRelease: "v2.1.0",
    root: rel(root, root),
    outputDir: rel(root, outputDir),
    paths: {
      index: rel(root, join(outputDir, "index.html")),
      dashboard: rel(root, join(outputDir, "dashboard.json")),
      approvalInbox: rel(root, approvalHtmlPath),
      approvalState: rel(root, approvalStatePath),
      approvalDecisionLog: rel(root, decisionLogPath),
      auditViewer: rel(root, auditBuild.indexPath),
      auditCatalog: rel(root, auditBuild.catalogPath),
      packet: rel(root, join(outputDir, "approval-audit-packet.zip"))
    },
    summary: {
      approvals: approvalSummary,
      audit: auditSummary,
      packets: { count: approvalPackets.length + (auditCatalog.reports?.length || 0), approvalPackets: approvalPackets.length, auditPackets: auditCatalog.reports?.length || 0 }
    },
    approvals: {
      summary: approvalSummary,
      requests: store.state.requests
    },
    audit: {
      summary: auditSummary,
      reports: auditCatalog.reports || []
    },
    actions: {
      approve: "npm run approval:approve -- <approval-id>",
      reject: "npm run approval:reject -- <approval-id>",
      requestEvidence: "npm run approval:request-evidence -- <approval-id> \"business justification\"",
      build: "npm run product:surface:build",
      serve: "npm run product:surface:serve",
      exportPacket: "npm run product:surface:packet"
    }
  };
  surface.integrity = { dashboardHash: jsonHash(surface.summary) };
  const dashboardPath = writeJson(join(outputDir, "dashboard.json"), surface);
  const indexPath = join(outputDir, "index.html");
  writeFileSync(indexPath, renderProductSurfaceHtml(surface));
  const packetPath = createApprovalAuditProductPacket({ root, outputDir, surface, dashboardPath, approvalStatePath, approvalHtmlPath, auditCatalogPath: auditBuild.catalogPath });
  surface.paths.packet = rel(root, packetPath);
  writeJson(dashboardPath, surface);
  writeFileSync(indexPath, renderProductSurfaceHtml(surface));
  return { outputDir, indexPath, dashboardPath, packetPath, approvalStatePath, auditCatalogPath: auditBuild.catalogPath, reportCount: auditBuild.reportCount, approvalCount: store.state.requests.length, surface };
}

export function createApprovalAuditProductPacket(options = {}) {
  const root = resolve(options.root || process.cwd());
  const outputDir = resolve(options.outputDir || join(root, "reports", "approval-audit-surface"));
  const packetPath = resolve(options.packetPath || join(outputDir, "approval-audit-packet.zip"));
  const entries = [];
  const addFile = (name, path) => { if (path && existsSync(path)) entries.push({ name, data: readFileSync(path) }); };
  addFile("dashboard.json", options.dashboardPath || join(outputDir, "dashboard.json"));
  addFile("index.html", join(outputDir, "index.html"));
  addFile("approval/approvals.json", options.approvalStatePath || join(outputDir, "approval", "approvals.json"));
  addFile("approval/index.html", options.approvalHtmlPath || join(outputDir, "approval", "index.html"));
  addFile("audit/catalog.json", options.auditCatalogPath || join(outputDir, "audit", "catalog.json"));
  const manifest = {
    schema: "ruleoak.approval_audit_product_packet.v1",
    generatedAt: now(),
    latestPublicCoreRelease: "v2.1.0",
    entryCount: entries.length + 1,
    files: entries.map((entry) => ({ name: entry.name, sha256: createHash("sha256").update(entry.data).digest("hex") }))
  };
  entries.unshift({ name: "packet-manifest.json", data: `${JSON.stringify(manifest, null, 2)}\n` });
  return writeZipFile(entries, packetPath);
}

function contentType(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".zip") return "application/zip";
  return "application/octet-stream";
}

export function serveApprovalAuditProductSurface(options = {}) {
  const build = options.skipBuild ? { outputDir: resolve(options.outputDir || join(process.cwd(), "reports", "approval-audit-surface")) } : buildApprovalAuditProductSurface(options);
  const root = resolve(build.outputDir || options.outputDir);
  const host = options.host || "127.0.0.1";
  const port = Number(options.port || 8790);
  const server = createServer((req, res) => {
    const rawUrl = new URL(req.url || "/", `http://${host}:${port}`);
    let pathname = rawUrl.pathname === "/" ? "/index.html" : decodeURIComponent(rawUrl.pathname);
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    res.end(readFileSync(filePath));
  });
  return new Promise((resolvePromise) => {
    server.listen(port, host, () => resolvePromise({ server, host, port, url: `http://${host}:${port}`, outputDir: root }));
  });
}
