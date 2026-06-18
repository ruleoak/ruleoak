import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AuditLog } from "../runtime/audit-log.js";
import { PolicyEngine } from "../runtime/policy-engine.js";
import { ApprovalGate } from "../runtime/approval-gate.js";
import { EvidenceStore } from "../runtime/evidence-store.js";
import { createWriteRunId } from "./write-intent-records.js";

export class ApprovalGatedWriteRunner {
  constructor({ connectors = [], policy = {}, runId = createWriteRunId(), actor = "write-runner", dryRun = true } = {}) {
    this.connectors = connectors;
    this.policy = policy;
    this.runId = runId;
    this.actor = actor;
    this.dryRun = dryRun !== false;
    this.auditLog = new AuditLog({ runId });
    this.policyEngine = new PolicyEngine(policy);
    this.approvalGate = new ApprovalGate({ auditLog: this.auditLog });
    this.evidenceStore = new EvidenceStore({ auditLog: this.auditLog });
    this.intents = [];
    this.decisions = [];
    this.applied = [];
    this.auditLog.record("write_connectors.started", { actor, connectorCount: connectors.length, dryRun: this.dryRun });
  }

  propose(intent) {
    const decision = this.policyEngine.evaluate(intent.action, { intent, dryRun: this.dryRun });
    const approval = this.approvalGate.handleDecision(decision, intent.actor || this.actor);
    const evidence = this.evidenceStore.add({
      id: `${intent.id}-evidence`,
      source: "approval_gated_write_runner",
      claim: `Write intent ${intent.action} was evaluated before execution.`,
      value: decision.decision,
      metadata: { intentId: intent.id, connector: intent.connector, target: intent.target, dryRun: this.dryRun }
    });
    const record = {
      intentId: intent.id,
      runId: this.runId,
      connector: intent.connector,
      action: intent.action,
      target: intent.target,
      actor: intent.actor || this.actor,
      decision: decision.decision,
      allowedNow: decision.allowedNow,
      approvalRequired: decision.approvalRequired,
      blocked: decision.blocked,
      reason: decision.reason,
      approvalRequestId: approval.request?.id || null,
      evidenceId: evidence.id,
      dryRun: this.dryRun
    };
    this.intents.push(intent);
    this.decisions.push(record);
    this.auditLog.record("write.intent_proposed", { intentId: intent.id, connector: intent.connector, action: intent.action, target: intent.target });
    this.auditLog.record("write.policy_decision", record);
    return record;
  }

  proposeFromConnectors() {
    for (const connector of this.connectors) {
      for (const intent of connector.proposeWrites()) this.propose(intent);
    }
    return [...this.decisions];
  }

  approve(approvalRequestId, { actor = "human_reviewer", reason = "Approved for demo" } = {}) {
    const request = this.approvalGate.requests.find((r) => r.id === approvalRequestId);
    if (!request) throw new Error(`Approval request not found: ${approvalRequestId}`);
    request.status = "approved";
    request.approvedBy = actor;
    request.approvedAt = new Date().toISOString();
    request.approvalReason = reason;
    this.auditLog.record("approval.approved", request);
    return request;
  }

  applyApproved({ outboxPath } = {}) {
    const approvedActionIds = new Set(this.approvalGate.requests.filter((r) => r.status === "approved").map((r) => r.action));
    for (const decision of this.decisions) {
      const intent = this.intents.find((i) => i.id === decision.intentId);
      if (!intent || decision.blocked) continue;
      const approved = !decision.approvalRequired || approvedActionIds.has(decision.action);
      if (!approved) {
        this.auditLog.record("write.not_applied_pending_approval", { intentId: decision.intentId, action: decision.action });
        continue;
      }
      const connector = this.connectors.find((c) => c.id === intent.connector);
      const applied = connector?.applyWrite ? connector.applyWrite(intent, { dryRun: this.dryRun }) : { status: "simulated", intent };
      this.applied.push({ ...applied, intentId: intent.id, action: intent.action, dryRun: this.dryRun });
      this.auditLog.record("write.applied_to_outbox", { intentId: intent.id, action: intent.action, dryRun: this.dryRun });
    }
    if (outboxPath) {
      mkdirSync(dirname(outboxPath), { recursive: true });
      writeFileSync(outboxPath, JSON.stringify({ runId: this.runId, dryRun: this.dryRun, applied: this.applied }, null, 2));
    }
    return [...this.applied];
  }

  report({ title = "RuleOak Approval-gated Write Connector Report", summary = "Write intents were policy-checked and approval-gated before any simulated external write." } = {}) {
    return {
      runtimeVersion: "1.4.0",
      runtimeStage: "approval-gated-write-connectors",
      run: { id: this.runId, app: "RuleOak Approval-gated Write Connector Runner", status: "completed" },
      summary: {
        title,
        summary,
        proposed: this.intents.length,
        allowed: this.decisions.filter((d) => d.allowedNow).length,
        approvalRequired: this.decisions.filter((d) => d.approvalRequired).length,
        blocked: this.decisions.filter((d) => d.blocked).length,
        appliedToOutbox: this.applied.length,
        dryRun: this.dryRun
      },
      writeIntents: [...this.intents],
      writeDecisions: [...this.decisions],
      applied: [...this.applied],
      approvals: this.approvalGate.list(),
      evidence: this.evidenceStore.list(),
      auditEvents: this.auditLog.list(),
      connectorBoundary: {
        mode: "approval_gated_write_demo",
        network: "not used by demo connectors",
        credentials: "not required by fixture connectors",
        writes: this.dryRun ? "simulated local outbox only" : "connector applyWrite implementation only"
      },
      boundaryNote: "v1.4 write connectors are approval-gated demos. They create local outbox records and do not update GitHub, Jira, or external systems."
    };
  }
}
