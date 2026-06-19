import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const STATE_VERSION = "ruleoak.approval_ux.v2";
const SLA_HOURS_BY_RISK = { critical: 4, high: 8, medium: 24, low: 72, unknown: 48 };
const REVIEW_STATUSES = new Set(["pending", "approved", "rejected", "evidence_requested", "cancelled"]);

function now() { return new Date().toISOString(); }

function addHours(iso, hours) {
  const base = iso ? new Date(iso) : new Date();
  if (Number.isNaN(base.getTime())) return new Date(Date.now() + hours * 3600_000).toISOString();
  return new Date(base.getTime() + hours * 3600_000).toISOString();
}

function normalizeRisk(risk = "unknown") {
  const value = String(risk || "unknown").toLowerCase();
  if (["critical", "high", "medium", "low"].includes(value)) return value;
  return "unknown";
}

function defaultSlaDueAt(createdAt, risk) {
  const normalized = normalizeRisk(risk);
  return addHours(createdAt, SLA_HOURS_BY_RISK[normalized] || SLA_HOURS_BY_RISK.unknown);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function normalizeRequestedEvidence(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  return [String(input)].filter(Boolean);
}

function normalizeRequest(input = {}, source = "manual") {
  const id = input.id || input.requestId || input.approvalRequestId || `${source}-${Math.random().toString(16).slice(2)}`;
  const metadata = input.metadata || {};
  const decision = metadata.decision || input.decision || {};
  const createdAt = input.createdAt || now();
  const risk = normalizeRisk(input.risk || metadata.risk || decision.risk || "unknown");
  const status = REVIEW_STATUSES.has(input.status) ? input.status : "pending";
  const requestedEvidence = normalizeRequestedEvidence(input.requestedEvidence || metadata.requestedEvidence || decision.requestedEvidence);
  const evidenceStatus = input.evidenceStatus || (requestedEvidence.length ? "requested" : (input.evidenceId || decision.evidenceId ? "attached" : "not_attached"));
  const reviewer = input.reviewer || input.assignedReviewer || metadata.reviewer || null;
  return {
    id,
    action: input.action || input.toolId || decision.toolId || decision.action || "unknown_action",
    subject: input.subject || input.target || decision.subject || decision.target || null,
    actor: input.actor || input.requestedBy || decision.actor || "agent",
    reason: input.reason || input.policyReason || decision.reason || "Approval required by RuleOak policy.",
    status,
    risk,
    severity: input.severity || metadata.severity || risk,
    priority: input.priority || metadata.priority || (risk === "critical" || risk === "high" ? "urgent" : risk === "medium" ? "normal" : "low"),
    evidenceId: input.evidenceId || decision.evidenceId || null,
    evidenceStatus,
    requestedEvidence,
    reportSource: input.reportSource || source,
    createdAt,
    slaDueAt: input.slaDueAt || metadata.slaDueAt || defaultSlaDueAt(createdAt, risk),
    decidedAt: input.decidedAt || null,
    decidedBy: input.decidedBy || null,
    decisionReason: input.decisionReason || null,
    reviewNote: input.reviewNote || metadata.reviewNote || null,
    reviewer,
    reviewerRole: input.reviewerRole || metadata.reviewerRole || null,
    delegation: input.delegation || metadata.delegation || null,
    metadata,
    history: Array.isArray(input.history) ? input.history : []
  };
}

function addHistory(request, event) {
  request.history = Array.isArray(request.history) ? request.history : [];
  request.history.push({ at: now(), ...event });
  return request;
}

function isOverdue(request, at = new Date()) {
  if (!request?.slaDueAt || request.status === "approved" || request.status === "rejected" || request.status === "cancelled") return false;
  const due = new Date(request.slaDueAt);
  return !Number.isNaN(due.getTime()) && due.getTime() < at.getTime();
}

export class ApprovalInboxStore {
  constructor({ path = "reports/approval-inbox/approvals.json" } = {}) {
    this.path = path;
    this.state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { version: STATE_VERSION, generatedAt: now(), requests: [] };
    this.state.version = STATE_VERSION;
    this.state.requests = Array.isArray(this.state.requests) ? this.state.requests.map((r) => normalizeRequest(r, r.reportSource || "state")) : [];
  }

  static fromReports(reportPaths = [], options = {}) {
    const store = new ApprovalInboxStore(options);
    for (const reportPath of reportPaths) {
      if (!existsSync(reportPath)) continue;
      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      store.ingestReport(report, reportPath);
    }
    store.save();
    return store;
  }

  ingestReport(report, reportSource = "report") {
    const approvals = Array.isArray(report.approvals) ? report.approvals : [];
    const decisions = [...(Array.isArray(report.toolDecisions) ? report.toolDecisions : []), ...(Array.isArray(report.writeDecisions) ? report.writeDecisions : [])];
    for (const item of approvals) this.add(normalizeRequest(item.request || item, reportSource));
    for (const decision of decisions.filter((d) => d.approvalRequired)) {
      this.add(normalizeRequest({
        id: decision.approvalRequestId || decision.requestId || decision.intentId,
        action: decision.toolId || decision.action,
        subject: decision.subject || decision.target,
        actor: decision.actor,
        reason: decision.reason,
        risk: decision.risk,
        evidenceId: decision.evidenceId,
        requestedEvidence: decision.requestedEvidence,
        metadata: { decision }
      }, reportSource));
    }
    return this;
  }

  add(request) {
    const normalized = normalizeRequest(request);
    const existing = this.state.requests.findIndex((r) => r.id === normalized.id);
    if (existing >= 0) {
      const previous = this.state.requests[existing];
      this.state.requests[existing] = {
        ...previous,
        ...normalized,
        history: Array.isArray(previous.history) && previous.history.length ? previous.history : normalized.history
      };
    } else {
      addHistory(normalized, { event: "created", actor: normalized.actor, reason: normalized.reason });
      this.state.requests.push(normalized);
    }
    return normalized;
  }

  list(status) {
    return status ? this.state.requests.filter((r) => r.status === status) : [...this.state.requests];
  }

  get(id) {
    return this.state.requests.find((r) => r.id === id) || null;
  }

  assign(id, { reviewer, reviewerRole = null, actor = "approval_coordinator", reason = "Assigned for review" } = {}) {
    if (!reviewer) throw new Error("reviewer is required");
    const request = this.get(id);
    if (!request) throw new Error(`Approval request not found: ${id}`);
    request.reviewer = reviewer;
    request.reviewerRole = reviewerRole;
    addHistory(request, { event: "assigned", actor, reason, reviewer, reviewerRole });
    this.save();
    return request;
  }

  requestEvidence(id, { actor = "human_reviewer", reason = "More evidence is required before approval.", evidence = [], note = null } = {}) {
    const request = this.get(id);
    if (!request) throw new Error(`Approval request not found: ${id}`);
    request.status = "evidence_requested";
    request.evidenceStatus = "requested";
    request.requestedEvidence = [...new Set([...(request.requestedEvidence || []), ...normalizeRequestedEvidence(evidence)])];
    request.reviewNote = note || request.reviewNote || null;
    addHistory(request, { event: "evidence_requested", actor, reason, requestedEvidence: request.requestedEvidence, note });
    this.save();
    return request;
  }

  decide(id, status, { actor = "human_reviewer", reason = "Reviewed in RuleOak Approval Inbox", note = null } = {}) {
    if (!["approved", "rejected"].includes(status)) throw new Error(`Unsupported approval decision: ${status}`);
    const request = this.get(id);
    if (!request) throw new Error(`Approval request not found: ${id}`);
    request.status = status;
    request.evidenceStatus = request.evidenceId ? "attached" : request.evidenceStatus;
    request.decidedAt = now();
    request.decidedBy = actor;
    request.decisionReason = reason;
    request.reviewNote = note || request.reviewNote || null;
    addHistory(request, { event: status, actor, reason, note });
    this.save();
    return request;
  }

  approve(id, options = {}) { return this.decide(id, "approved", options); }
  reject(id, options = {}) { return this.decide(id, "rejected", options); }

  summary() {
    const risks = this.state.requests.reduce((acc, request) => {
      acc[request.risk || "unknown"] = (acc[request.risk || "unknown"] || 0) + 1;
      return acc;
    }, {});
    const priorities = this.state.requests.reduce((acc, request) => {
      acc[request.priority || "normal"] = (acc[request.priority || "normal"] || 0) + 1;
      return acc;
    }, {});
    return {
      version: STATE_VERSION,
      total: this.state.requests.length,
      pending: this.list("pending").length,
      approved: this.list("approved").length,
      rejected: this.list("rejected").length,
      evidenceRequested: this.list("evidence_requested").length,
      overdue: this.state.requests.filter((request) => isOverdue(request)).length,
      risks,
      priorities
    };
  }

  exportDecisionLog(path = "reports/approval-inbox/approval-decisions.jsonl") {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
    for (const request of this.state.requests) {
      if (request.status === "approved" || request.status === "rejected" || request.status === "evidence_requested") {
        appendFileSync(path, JSON.stringify({
          id: request.id,
          action: request.action,
          subject: request.subject,
          status: request.status,
          risk: request.risk,
          priority: request.priority,
          slaDueAt: request.slaDueAt,
          decidedAt: request.decidedAt,
          decidedBy: request.decidedBy,
          decisionReason: request.decisionReason,
          requestedEvidence: request.requestedEvidence,
          evidenceId: request.evidenceId,
          evidenceStatus: request.evidenceStatus,
          reportSource: request.reportSource
        }) + "\n");
      }
    }
    return path;
  }

  exportApprovalPacket(id, path = `reports/approval-inbox/packets/${id}.approval-packet.json`) {
    const request = this.get(id);
    if (!request) throw new Error(`Approval request not found: ${id}`);
    const packet = {
      protocol: "ruleoak.approval_packet.v1",
      generatedAt: now(),
      request,
      reviewerContext: {
        reviewer: request.reviewer,
        reviewerRole: request.reviewerRole,
        slaDueAt: request.slaDueAt,
        overdue: isOverdue(request),
        evidenceStatus: request.evidenceStatus,
        requestedEvidence: request.requestedEvidence
      },
      integrity: {
        requestHash: sha256(request)
      }
    };
    packet.integrity.packetHash = sha256({ ...packet, integrity: { requestHash: packet.integrity.requestHash } });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(packet, null, 2));
    return { path, packet };
  }

  save() {
    this.state.version = STATE_VERSION;
    this.state.generatedAt = now();
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.state, null, 2));
    return this.state;
  }
}

export function renderApprovalInboxHtml(state = { requests: [] }) {
  const requests = state.requests || [];
  const summary = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    evidenceRequested: requests.filter((r) => r.status === "evidence_requested").length,
    overdue: requests.filter((r) => isOverdue(r)).length,
    high: requests.filter((r) => r.risk === "high" || r.risk === "critical").length
  };
  const cards = requests.map((r) => `
    <article class="request ${escapeHtml(r.status)}" id="${escapeHtml(r.id)}" data-status="${escapeHtml(r.status)}" data-risk="${escapeHtml(r.risk)}">
      <div class="request-head">
        <div>
          <p class="eyebrow">${escapeHtml(r.risk || "unknown")} risk · ${escapeHtml(r.priority || "normal")} priority</p>
          <h2>${escapeHtml(r.action)}</h2>
          <p class="muted">${escapeHtml(r.subject || "No subject")} · ${escapeHtml(r.id)}</p>
        </div>
        <span class="pill ${escapeHtml(r.status)}">${escapeHtml(r.status.replaceAll("_", " "))}</span>
      </div>
      <div class="decision-grid">
        <div><span>Requested by</span><strong>${escapeHtml(r.actor || "agent")}</strong></div>
        <div><span>Reviewer</span><strong>${escapeHtml(r.reviewer || "Unassigned")}</strong></div>
        <div><span>SLA due</span><strong>${escapeHtml(formatDate(r.slaDueAt))}${isOverdue(r) ? " ⚠" : ""}</strong></div>
        <div><span>Evidence</span><strong>${escapeHtml(r.evidenceStatus || "not_attached")}</strong></div>
        <div><span>Evidence ID</span><strong>${escapeHtml(r.evidenceId || "Not attached")}</strong></div>
        <div><span>Source</span><strong>${escapeHtml(shorten(r.reportSource || "local"))}</strong></div>
        <div><span>Created</span><strong>${escapeHtml(formatDate(r.createdAt))}</strong></div>
        <div><span>Packet</span><strong><code>npm run approval:packet -- ${escapeHtml(r.id)}</code></strong></div>
      </div>
      <section class="reason">
        <h3>Policy reason</h3>
        <p>${escapeHtml(r.reason || "Approval required by RuleOak policy.")}</p>
      </section>
      ${(r.requestedEvidence || []).length ? `<section class="reason evidence"><h3>Requested evidence</h3><ul>${r.requestedEvidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      ${r.decidedAt ? `<section class="reason decision"><h3>Decision</h3><p>${escapeHtml(r.status)} by ${escapeHtml(r.decidedBy || "reviewer")} — ${escapeHtml(r.decisionReason || "No note")}</p></section>` : ""}
      ${r.reviewNote ? `<section class="reason"><h3>Reviewer note</h3><p>${escapeHtml(r.reviewNote)}</p></section>` : ""}
      <details>
        <summary>Review history / Approval history</summary>
        <ul>${(r.history || []).map((h) => `<li>${escapeHtml(formatDate(h.at))}: ${escapeHtml(h.event)} ${h.actor ? "by " + escapeHtml(h.actor) : ""} ${h.reason ? "— " + escapeHtml(h.reason) : ""}</li>`).join("") || "<li>No history recorded</li>"}</ul>
      </details>
    </article>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Approval UX v2</title><style>
  :root{--bg:#f6f8f4;--panel:#fff;--text:#17212b;--muted:#5d6a75;--green:#135f3c;--green2:#1d7a4d;--gold:#c9941e;--line:#d8e1e8;--red:#9b1c1c;--blue:#1d4ed8;--shadow:0 18px 45px rgba(19,32,45,.08)}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(180deg,#fbfcfa,#eef4ef);color:var(--text);line-height:1.6}main{max-width:1180px;margin:0 auto;padding:36px 22px 80px}.hero,.panel,.request{background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:24px;padding:24px;box-shadow:var(--shadow)}.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:22px;align-items:center}h1{font-size:clamp(36px,6vw,64px);line-height:1;margin:8px 0;letter-spacing:-.035em}h2{font-size:24px;margin:0 0 4px}.eyebrow{color:var(--green);letter-spacing:.13em;text-transform:uppercase;font-weight:800;font-size:12px;margin:0 0 8px}.muted,span{color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin:18px 0}.metric{background:#f8faf8;border:1px solid var(--line);border-radius:18px;padding:16px}.metric strong{font-size:30px;display:block}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.filter{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 13px;font-weight:700}.requests{display:grid;gap:16px}.request-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.pill{padding:7px 11px;border-radius:999px;background:#eef3f7;font-weight:800}.pending{color:#8a5b00;background:#fff5d6}.approved{color:#0b6b3d;background:#dff6e9}.rejected{color:#9b1c1c;background:#fee2e2}.evidence_requested{color:#1d4ed8;background:#dbeafe}.decision-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.decision-grid div{border:1px solid var(--line);border-radius:16px;padding:13px;background:#fbfcfa}.decision-grid strong{display:block;overflow-wrap:anywhere}.reason{border-left:4px solid var(--green);padding:12px 14px;background:#f7faf8;border-radius:12px;margin:12px 0}.reason h3{margin:0 0 6px}.reason p{margin:0}.decision{border-left-color:var(--gold)}.evidence{border-left-color:var(--blue)}details{margin-top:12px}summary{cursor:pointer;font-weight:800;color:var(--green)}code{background:#eef3f7;padding:2px 5px;border-radius:5px}.empty{text-align:center;padding:42px}.help{font-size:14px}@media(max-width:900px){.hero,.metrics,.decision-grid{grid-template-columns:1fr}.request-head{display:block}}</style></head><body><main><section class="hero"><div><p class="eyebrow">RuleOak RuleOak Core v2.1.0 release</p><h1>Approval UX v2</h1><p><strong>Local Approval Inbox</strong> for approval-required AI tool calls with risk, SLA, reviewer identity, requested evidence, decision comments, history, and exportable approval packets.</p></div><div class="panel help"><strong>Local-first review boundary</strong><br>This UI reads and writes local files only. It records review decisions; it does not execute approved actions, call external services, or replace enterprise IAM/RBAC.</div></section><section class="metrics"><div class="metric"><span>Total</span><strong>${summary.total}</strong></div><div class="metric"><span>Pending</span><strong>${summary.pending}</strong></div><div class="metric"><span>Evidence</span><strong>${summary.evidenceRequested}</strong></div><div class="metric"><span>Approved</span><strong>${summary.approved}</strong></div><div class="metric"><span>Rejected</span><strong>${summary.rejected}</strong></div><div class="metric"><span>Overdue</span><strong>${summary.overdue}</strong></div></section><section class="toolbar"><a class="filter" href="#pending">Pending</a><a class="filter" href="#approved">Approved</a><a class="filter" href="#rejected">Rejected</a><span class="filter">CLI: <code>npm run approval:approve -- &lt;id&gt;</code></span><span class="filter">CLI: <code>npm run approval:reject -- &lt;id&gt;</code></span><span class="filter">CLI: <code>npm run approval:request-evidence -- &lt;id&gt;</code></span></section><section class="requests">${cards || '<div class="panel empty">No approval requests found. Run <code>npm run approval:ux:v2</code>, <code>npm run policy:demo</code>, or <code>npm run guard:demo</code>, then rebuild the inbox.</div>'}</section></main></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }); } catch { return String(value); }
}

function shorten(value) {
  const text = String(value ?? "");
  return text.length > 48 ? `…${text.slice(-45)}` : text;
}
