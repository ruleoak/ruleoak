import { randomUUID } from "node:crypto";
import { AuditLog } from "../runtime/audit-log.js";
import { PolicyEngine } from "../runtime/policy-engine.js";
import { EvidenceStore } from "../runtime/evidence-store.js";
import { ApprovalGate } from "../runtime/approval-gate.js";
import { ToolManifest } from "./tool-manifest.js";
import { ToolRiskClassifier } from "./risk-classifier.js";

function effectToDecision(effect, toolId, risk, reason) {
  if (effect === "deny" || effect === "blocked") {
    return { action: toolId, decision: "blocked", allowedNow: false, approvalRequired: false, blocked: true, reason: reason || `risk ${risk} blocked` };
  }
  if (effect === "approval_required") {
    return { action: toolId, decision: "approval_required", allowedNow: false, approvalRequired: true, blocked: false, reason: reason || `risk ${risk} requires approval` };
  }
  return { action: toolId, decision: "allowed", allowedNow: true, approvalRequired: false, blocked: false, reason: reason || `risk ${risk} allowed` };
}

export class ToolGuard {
  constructor({ manifest = new ToolManifest(), policy = {}, runId, actor = "agent", riskClassifier = new ToolRiskClassifier(), clock } = {}) {
    this.manifest = manifest instanceof ToolManifest ? manifest : ToolManifest.fromObject(manifest);
    this.policy = policy || {};
    this.actor = actor;
    this.runId = runId || `roak-tool-run-${Date.now()}`;
    this.auditLog = new AuditLog({ runId: this.runId, clock });
    this.policyEngine = new PolicyEngine(policy);
    this.evidenceStore = new EvidenceStore({ auditLog: this.auditLog });
    this.approvalGate = new ApprovalGate({ auditLog: this.auditLog });
    this.riskClassifier = riskClassifier;
    this.decisions = [];
    this.auditLog.record("tool_guard.started", { actor, boundary: this.policyEngine.boundary(), toolCount: this.manifest.list().length });
  }

  evaluateToolCall(call = {}) {
    const toolId = call.toolId || call.tool || call.name || call.action;
    if (!toolId) throw new Error("tool call must include toolId, tool, name, or action");
    const tool = this.manifest.get(toolId) || { id: toolId, name: toolId, kind: "undeclared_tool", risk: "unknown", metadata: { declared: false } };
    const risk = this.riskClassifier.classify(tool, call);
    const explicit = this.policyEngine.evaluate(toolId, { ...call, risk, tool });
    let decision = explicit;
    if (explicit.decision === "unknown_action_requires_review") {
      decision = effectToDecision(this.riskClassifier.defaultEffectForRisk(risk), toolId, risk, `not declared in policy; default risk ${risk}`);
    }
    const requestId = call.requestId || `tool-${randomUUID()}`;
    const evidence = this.evidenceStore.add({
      id: `${requestId}-evidence`,
      source: "tool_guard",
      claim: `Tool call ${toolId} was evaluated before execution.`,
      value: decision.decision,
      metadata: { requestId, toolId, risk, subject: call.subject || null, inputPreview: call.inputPreview || null }
    });
    this.auditLog.record("tool.requested", { requestId, toolId, subject: call.subject || null, risk, actor: call.actor || this.actor });
    this.auditLog.record("tool.policy_decision", { requestId, toolId, decision: decision.decision, reason: decision.reason, risk });
    const approval = this.approvalGate.handleDecision(decision, call.actor || this.actor);
    const record = {
      requestId,
      runId: this.runId,
      toolId,
      tool,
      subject: call.subject || null,
      actor: call.actor || this.actor,
      risk,
      decision: decision.decision,
      allowedNow: decision.allowedNow,
      approvalRequired: decision.approvalRequired,
      blocked: decision.blocked,
      reason: decision.reason,
      evidenceId: evidence.id,
      approvalRequestId: approval.request?.id || null,
      metadata: call.metadata || {}
    };
    this.decisions.push(record);
    return record;
  }

  report({ title = "RuleOak Tool Guard Report", summary = "Governed tool-call decisions before execution." } = {}) {
    const allowed = this.decisions.filter((d) => d.allowedNow).length;
    const approvalRequired = this.decisions.filter((d) => d.approvalRequired).length;
    const blocked = this.decisions.filter((d) => d.blocked).length;
    return {
      runtimeVersion: "2.0.0",
      runtimeStage: "governed-tool-calls",
      run: { id: this.runId, app: "RuleOak Tool Guard", status: "completed" },
      summary: { title, summary, allowed, approvalRequired, blocked, toolDecisionCount: this.decisions.length },
      toolDecisions: [...this.decisions],
      evidence: this.evidenceStore.list(),
      approvals: this.approvalGate.list(),
      auditEvents: this.auditLog.list(),
      ruleoakPattern: {
        policy: "Tool calls are evaluated before execution.",
        evidence: "Each decision records evidence describing the tool request.",
        approval: "Risky actions are paused for human approval.",
        audit: "Every tool request, decision, evidence record, and approval request is auditable."
      },
      boundaryNote: "Tool Guard governs whether a tool call should proceed. It does not execute tools, replace runtime sandboxing, or certify compliance."
    };
  }
}
