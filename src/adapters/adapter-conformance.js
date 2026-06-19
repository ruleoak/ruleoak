import { ToolGuard } from "../guard/tool-guard.js";

export const RULEOAK_ADAPTER_CONFORMANCE_VERSION = "ruleoak.adapter_conformance.v1";

export function normalizeAdapterDecision(decision = {}) {
  return {
    requestId: decision.requestId || null,
    runId: decision.runId || null,
    toolId: decision.toolId || decision.action || null,
    effect: decision.blocked ? "deny" : decision.approvalRequired ? "approval_required" : "allow",
    allowedNow: Boolean(decision.allowedNow),
    approvalRequired: Boolean(decision.approvalRequired),
    blocked: Boolean(decision.blocked),
    reason: decision.reason || "No RuleOak decision reason provided.",
    evidenceId: decision.evidenceId || null,
    approvalRequestId: decision.approvalRequestId || null,
    adapterMetadata: decision.metadata || {}
  };
}

export function createAdapterGuard({ guard, manifest, policy, actor = "ruleoak-adapter", runId } = {}) {
  return guard instanceof ToolGuard ? guard : new ToolGuard({ manifest, policy, actor, runId });
}

export function evaluateAdapterToolCall({ guard, toolId, subject, actor, input = {}, metadata = {} } = {}) {
  if (!guard || typeof guard.evaluateToolCall !== "function") throw new Error("evaluateAdapterToolCall requires a ToolGuard-like guard");
  if (!toolId) throw new Error("evaluateAdapterToolCall requires toolId");
  const decision = guard.evaluateToolCall({
    toolId,
    subject: subject || toolId,
    actor,
    inputPreview: Object.keys(input || {}).slice(0, 16),
    metadata: {
      conformance: RULEOAK_ADAPTER_CONFORMANCE_VERSION,
      ...metadata
    }
  });
  return { raw: decision, normalized: normalizeAdapterDecision(decision) };
}

export function createAdapterResult({ adapter, framework, decision, executed, result = null, error = null, mode = "return_decision" } = {}) {
  return {
    schema: RULEOAK_ADAPTER_CONFORMANCE_VERSION,
    adapter,
    framework,
    mode,
    executed: Boolean(executed),
    skipped: !executed,
    ruleoak: normalizeAdapterDecision(decision),
    result,
    error: error ? { name: error.name || "Error", message: error.message || String(error) } : null
  };
}

export async function runGovernedAdapterTool({
  adapter,
  framework,
  toolId,
  tool,
  guard,
  subject,
  actor,
  input = {},
  context = {},
  metadata = {},
  mode = "return_decision"
} = {}) {
  if (!toolId) throw new Error("runGovernedAdapterTool requires toolId");
  if (typeof tool !== "function") throw new Error("runGovernedAdapterTool requires tool function");
  const { raw: decision } = evaluateAdapterToolCall({
    guard,
    toolId,
    subject,
    actor: context.actor || actor,
    input,
    metadata: { adapter, framework, ...metadata }
  });
  if (decision.blocked || decision.approvalRequired) {
    if (mode === "throw") {
      const error = new Error(decision.blocked ? "RuleOak blocked adapter tool call" : "RuleOak approval required before adapter tool call");
      error.ruleoak = normalizeAdapterDecision(decision);
      throw error;
    }
    return createAdapterResult({ adapter, framework, decision, executed: false, result: null, mode });
  }
  try {
    const result = await tool(input, context);
    if (guard.auditLog?.record) guard.auditLog.record(`adapter.${adapter}.tool_completed`, { toolId, requestId: decision.requestId, framework });
    return createAdapterResult({ adapter, framework, decision, executed: true, result, mode });
  } catch (error) {
    if (guard.auditLog?.record) guard.auditLog.record(`adapter.${adapter}.tool_failed`, { toolId, requestId: decision.requestId, framework, message: error.message });
    if (mode === "throw") throw error;
    return createAdapterResult({ adapter, framework, decision, executed: true, result: null, error, mode });
  }
}

export function adapterConformanceReport({ name = "RuleOak adapter conformance", adapters = [], reports = [], guard = null } = {}) {
  const decisions = reports.map((report) => report.ruleoak || report);
  return {
    schema: RULEOAK_ADAPTER_CONFORMANCE_VERSION,
    name,
    adapters,
    summary: {
      total: decisions.length,
      allowed: decisions.filter((d) => d.effect === "allow").length,
      approvalRequired: decisions.filter((d) => d.effect === "approval_required").length,
      denied: decisions.filter((d) => d.effect === "deny").length,
      executed: reports.filter((r) => r.executed).length,
      skipped: reports.filter((r) => r.skipped).length
    },
    reports,
    guardReport: guard && typeof guard.report === "function" ? guard.report({ title: name }) : null,
    boundary: "RuleOak adapters evaluate tool calls before framework execution. They do not replace framework sandboxes, authentication, or human process controls."
  };
}
