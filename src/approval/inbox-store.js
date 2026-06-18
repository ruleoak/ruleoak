import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function now() { return new Date().toISOString(); }

function normalizeRequest(input = {}, source = "manual") {
  const id = input.id || input.requestId || input.approvalRequestId || `${source}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    action: input.action || input.toolId || "unknown_action",
    subject: input.subject || input.target || null,
    actor: input.actor || input.requestedBy || "agent",
    reason: input.reason || input.policyReason || "Approval required by RuleOak policy.",
    status: input.status || "pending",
    risk: input.risk || input.metadata?.risk || "unknown",
    evidenceId: input.evidenceId || null,
    reportSource: input.reportSource || source,
    createdAt: input.createdAt || now(),
    decidedAt: input.decidedAt || null,
    decidedBy: input.decidedBy || null,
    decisionReason: input.decisionReason || null,
    metadata: input.metadata || {}
  };
}

export class ApprovalInboxStore {
  constructor({ path = "reports/approval-inbox/approvals.json" } = {}) {
    this.path = path;
    this.state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { version: "2.0.0", generatedAt: now(), requests: [] };
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
        metadata: { decision }
      }, reportSource));
    }
    return this;
  }

  add(request) {
    const normalized = normalizeRequest(request);
    const existing = this.state.requests.findIndex((r) => r.id === normalized.id);
    if (existing >= 0) this.state.requests[existing] = { ...this.state.requests[existing], ...normalized };
    else this.state.requests.push(normalized);
    return normalized;
  }

  list(status) {
    return status ? this.state.requests.filter((r) => r.status === status) : [...this.state.requests];
  }

  decide(id, status, { actor = "human_reviewer", reason = "Reviewed in RuleOak Approval Inbox" } = {}) {
    if (!["approved", "rejected"].includes(status)) throw new Error(`Unsupported approval decision: ${status}`);
    const request = this.state.requests.find((r) => r.id === id);
    if (!request) throw new Error(`Approval request not found: ${id}`);
    request.status = status;
    request.decidedAt = now();
    request.decidedBy = actor;
    request.decisionReason = reason;
    this.save();
    return request;
  }

  approve(id, options = {}) { return this.decide(id, "approved", options); }
  reject(id, options = {}) { return this.decide(id, "rejected", options); }

  summary() {
    return {
      total: this.state.requests.length,
      pending: this.list("pending").length,
      approved: this.list("approved").length,
      rejected: this.list("rejected").length
    };
  }

  save() {
    this.state.generatedAt = now();
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.state, null, 2));
    return this.state;
  }
}

export function renderApprovalInboxHtml(state = { requests: [] }) {
  const rows = (state.requests || []).map((r) => `
    <tr data-status="${r.status}">
      <td><strong>${escapeHtml(r.action)}</strong><br><span>${escapeHtml(r.id)}</span></td>
      <td>${escapeHtml(r.subject || "—")}</td>
      <td><span class="pill ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
      <td>${escapeHtml(r.risk || "unknown")}</td>
      <td>${escapeHtml(r.reason || "")}</td>
    </tr>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Approval Inbox</title><style>
  :root{--bg:#f6f8f4;--panel:#fff;--text:#17212b;--muted:#5d6a75;--green:#135f3c;--gold:#c9941e;--line:#d8e1e8}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(180deg,#fbfcfa,#eef4ef);color:var(--text)}main{max-width:1160px;margin:0 auto;padding:36px 22px 80px}.hero,.card{background:rgba(255,255,255,.92);border:1px solid var(--line);border-radius:24px;padding:24px;box-shadow:0 18px 45px rgba(19,32,45,.08)}h1{font-size:clamp(32px,6vw,60px);line-height:1;margin:8px 0}.eyebrow{color:var(--green);letter-spacing:.13em;text-transform:uppercase;font-weight:800;font-size:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.metric{background:#f8faf8;border:1px solid var(--line);border-radius:18px;padding:16px}.metric strong{font-size:30px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:13px;vertical-align:top}th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.pill{padding:6px 10px;border-radius:999px;background:#eef3f7;font-weight:700}.pending{color:#8a5b00;background:#fff5d6}.approved{color:#0b6b3d;background:#dff6e9}.rejected{color:#9b1c1c;background:#fee2e2}span{color:var(--muted);font-size:12px}@media(max-width:800px){.grid{grid-template-columns:1fr 1fr}table{display:block;overflow-x:auto}}</style></head><body><main><section class="hero"><p class="eyebrow">RuleOak Core v2.0</p><h1>Local Approval Inbox</h1><p>Review pending governance approvals generated by RuleOak tool calls and approval-gated write intents. This local viewer does not call external services.</p></section><section class="grid"><div class="metric"><span>Total</span><br><strong>${state.requests.length}</strong></div><div class="metric"><span>Pending</span><br><strong>${state.requests.filter(r=>r.status==='pending').length}</strong></div><div class="metric"><span>Approved</span><br><strong>${state.requests.filter(r=>r.status==='approved').length}</strong></div><div class="metric"><span>Rejected</span><br><strong>${state.requests.filter(r=>r.status==='rejected').length}</strong></div></section><section class="card"><h2>Approval requests</h2><table><thead><tr><th>Action</th><th>Subject</th><th>Status</th><th>Risk</th><th>Reason</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No approval requests found.</td></tr>'}</tbody></table></section></main></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
