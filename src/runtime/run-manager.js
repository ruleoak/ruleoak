import { AuditLog } from "./audit-log.js";
import { PolicyEngine } from "./policy-engine.js";
import { EvidenceStore } from "./evidence-store.js";
import { ApprovalGate } from "./approval-gate.js";

export class RunManager {
  constructor({ app = "RuleOak App", policy = {}, runId, metadata = {}, clock } = {}) {
    this.run = {
      id: runId || `roak-run-${Date.now()}`,
      app,
      status: "created",
      startedAt: new Date().toISOString(),
      completedAt: null,
      metadata
    };
    this.auditLog = new AuditLog({ runId: this.run.id, clock });
    this.policyEngine = new PolicyEngine(policy);
    this.evidenceStore = new EvidenceStore({ auditLog: this.auditLog });
    this.approvalGate = new ApprovalGate({ auditLog: this.auditLog });
    this.policy = policy;
    this.auditLog.record("run.created", { app, metadata, boundary: this.policyEngine.boundary() });
  }

  start() {
    this.run.status = "running";
    this.auditLog.record("run.started", { status: this.run.status });
    return this;
  }

  addEvidence(item) {
    return this.evidenceStore.add(item);
  }

  addEvidenceMany(items) {
    return this.evidenceStore.addMany(items);
  }

  evaluateAction(action, context = {}) {
    const decision = this.policyEngine.evaluate(action, context);
    this.auditLog.record("policy.evaluated", decision);
    const approval = this.approvalGate.handleDecision(decision, context.proposedBy || "runtime");
    return { decision, approval };
  }

  complete({ summary = {}, output = {} } = {}) {
    this.run.status = "completed";
    this.run.completedAt = new Date().toISOString();
    this.auditLog.record("run.completed", { summary });
    return this.report({ summary, output });
  }

  report({ summary = {}, output = {} } = {}) {
    return {
      runtimeVersion: "2.0.0",
      runtimeStage: "early-runtime",
      run: { ...this.run },
      boundary: this.policyEngine.boundary(),
      summary,
      output,
      evidence: this.evidenceStore.list(),
      approvals: this.approvalGate.list(),
      auditEvents: this.auditLog.list(),
      ruleoakPattern: {
        policy: "Actions are evaluated against allow, block, and approval-required rules.",
        evidence: "Claims and recommendations are linked to evidence records.",
        approval: "Risky or publishing actions become pending approval requests.",
        audit: "Run lifecycle, evidence, policy decisions, and approval requests are recorded."
      },
      boundaryNote: "Early runtime only. Not a mature enterprise platform, security-reviewed sandbox, or compliance-certified product."
    };
  }
}
