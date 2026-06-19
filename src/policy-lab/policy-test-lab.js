import { join } from "node:path";
import { ToolGuard, ToolManifest } from "../guard/index.js";
import { PolicyPackRegistry } from "../policy-packs/index.js";

const DEFAULT_SCENARIO = {
  id: "ruleoak-default-policy-lab",
  title: "RuleOak default policy lab scenario",
  description: "Representative AI tool calls across local search, workspace writes, external communication, ticketing, cloud LLM use, and destructive operations.",
  calls: [
    { toolId: "search_docs", subject: "local documentation", expectedDecision: "allowed" },
    { toolId: "write_workspace_file", subject: "draft report", expectedDecision: "approval_required" },
    { toolId: "delete_workspace_file", subject: "workspace/data.json", expectedDecision: "blocked" },
    { toolId: "send_external_message", subject: "customer status update", expectedDecision: "approval_required" },
    { toolId: "read_ticket", subject: "PLAT-123", expectedDecision: "allowed" },
    { toolId: "comment_ticket", subject: "PLAT-123", expectedDecision: "approval_required" },
    { toolId: "cloud_llm_generate", subject: "redacted incident summary", expectedDecision: "approval_required" },
    { toolId: "upload_raw_data_to_cloud", subject: "raw export", expectedDecision: "blocked" }
  ]
};

function decisionRank(decision) {
  if (decision === "allowed") return 1;
  if (decision === "approval_required") return 2;
  if (decision === "blocked") return 3;
  return 0;
}

function normalizeCall(call = {}) {
  const toolId = call.toolId || call.tool || call.name || call.action;
  if (!toolId) throw new Error("policy lab scenario call requires toolId/tool/name/action");
  return {
    toolId,
    subject: call.subject || null,
    expectedDecision: call.expectedDecision || call.expected || null,
    actor: call.actor || undefined,
    metadata: call.metadata || {}
  };
}

export function normalizeScenario(scenario = DEFAULT_SCENARIO) {
  return {
    id: scenario.id || "policy-lab-scenario",
    title: scenario.title || "Policy lab scenario",
    description: scenario.description || "Policy lab scenario",
    calls: (scenario.calls || DEFAULT_SCENARIO.calls).map(normalizeCall)
  };
}

export function summarizeOutcomes(decisions = []) {
  const summary = { allowed: 0, approvalRequired: 0, blocked: 0, failedExpectations: 0, total: decisions.length };
  for (const item of decisions) {
    if (item.decision === "allowed") summary.allowed += 1;
    if (item.decision === "approval_required") summary.approvalRequired += 1;
    if (item.decision === "blocked") summary.blocked += 1;
    if (item.expectedDecision && item.expectedDecision !== item.decision) summary.failedExpectations += 1;
  }
  return summary;
}

export function comparePolicyOutcomes(beforeDecisions = [], afterDecisions = []) {
  const afterByTool = new Map(afterDecisions.map((item) => [item.toolId, item]));
  const changes = [];
  for (const before of beforeDecisions) {
    const after = afterByTool.get(before.toolId);
    if (!after) continue;
    if (before.decision === after.decision) continue;
    const beforeRank = decisionRank(before.decision);
    const afterRank = decisionRank(after.decision);
    changes.push({
      toolId: before.toolId,
      subject: before.subject || after.subject || null,
      before: before.decision,
      after: after.decision,
      direction: afterRank > beforeRank ? "more_restrictive" : "less_restrictive",
      beforeReason: before.reason,
      afterReason: after.reason
    });
  }
  return {
    changed: changes.length,
    moreRestrictive: changes.filter((item) => item.direction === "more_restrictive").length,
    lessRestrictive: changes.filter((item) => item.direction === "less_restrictive").length,
    changes
  };
}

function scenarioManifest(scenario) {
  return ToolManifest.fromObject({
    metadata: { source: "policy-lab", scenario: scenario.id },
    tools: scenario.calls.map((call) => ({
      id: call.toolId,
      name: call.toolId,
      risk: "auto",
      kind: "policy_lab_tool",
      metadata: { subject: call.subject }
    }))
  });
}

export class PolicyTestLab {
  constructor({ rootDir = process.cwd(), policyPackDir = join(rootDir, "policy-packs"), toolManifest = null, actor = "policy-lab" } = {}) {
    this.rootDir = rootDir;
    this.policyPackDir = policyPackDir;
    this.registry = PolicyPackRegistry.fromDirectory(policyPackDir);
    this.toolManifest = toolManifest;
    this.actor = actor;
  }

  listPacks() {
    return this.registry.list();
  }

  combinePacks(packIds = []) {
    const selected = packIds.length ? packIds : this.registry.list().map((pack) => pack.id);
    return this.registry.combine(selected);
  }

  runScenario({ packIds = [], scenario = DEFAULT_SCENARIO, title = "RuleOak Policy Test Lab Report" } = {}) {
    const normalizedScenario = normalizeScenario(scenario);
    const combined = this.combinePacks(packIds);
    const manifest = this.toolManifest ? ToolManifest.fromObject(this.toolManifest) : scenarioManifest(normalizedScenario);
    const guard = new ToolGuard({ manifest, policy: combined.policy, actor: this.actor, runId: `roak-policy-lab-${Date.now()}` });
    const decisions = normalizedScenario.calls.map((call) => {
      const decision = guard.evaluateToolCall(call);
      return {
        ...decision,
        expectedDecision: call.expectedDecision,
        expectationMet: call.expectedDecision ? call.expectedDecision === decision.decision : null
      };
    });
    const summary = summarizeOutcomes(decisions);
    return {
      runtimeVersion: "2.1.0",
      runtimeStage: "policy-test-lab",
      title,
      scenario: normalizedScenario,
      selectedPolicyPacks: combined.packIds,
      combinedPolicy: combined.policy,
      policyExplain: combined.explain,
      summary,
      decisions,
      evidence: guard.evidenceStore.list(),
      approvals: guard.approvalGate.list(),
      auditEvents: guard.auditLog.list(),
      guidance: {
        value: "Use policy:test before shipping an agent integration to verify which tool calls are allowed, blocked, or approval-gated.",
        boundary: "Policy Test Lab evaluates policy behavior. It does not execute tools and does not certify compliance."
      }
    };
  }

  explain(packIds = []) {
    const combined = this.combinePacks(packIds);
    return {
      runtimeVersion: "2.1.0",
      runtimeStage: "policy-test-lab",
      selectedPolicyPacks: combined.packIds,
      boundary: combined.policy.boundary,
      tools: combined.explain,
      summary: summarizeOutcomes(combined.explain.map((item) => ({ decision: item.decision }))),
      guidance: "Policy explanations show the combined effect and provenance of selected policy packs, with deny taking priority over approval and allow."
    };
  }


  validatePacks() {
    return this.registry.validateAll();
  }

  compatibilityMatrix() {
    return this.registry.compatibilityMatrix();
  }

  runPackScenarios({ packIds = [] } = {}) {
    const selectedIds = packIds.length ? packIds : this.registry.list().map((pack) => pack.id);
    const packs = selectedIds.map((id) => {
      const pack = this.registry.get(id);
      if (!pack) throw new Error(`Unknown policy pack: ${id}`);
      return pack;
    });
    const results = [];
    for (const pack of packs) {
      for (const scenario of pack.scenarioTests) {
        const report = this.runScenario({ packIds: [pack.id], scenario, title: `${pack.name} policy pack scenario` });
        results.push({
          packId: pack.id,
          packVersion: pack.version,
          scenarioId: scenario.id,
          title: scenario.title,
          valid: report.summary.failedExpectations === 0,
          summary: report.summary,
          decisions: report.decisions.map((item) => ({ toolId: item.toolId, decision: item.decision, expectedDecision: item.expectedDecision, expectationMet: item.expectationMet, reason: item.reason }))
        });
      }
    }
    return {
      runtimeVersion: "2.1.0",
      runtimeStage: "policy-pack-maturity",
      schemaVersion: "ruleoak.policy_pack.v1",
      summary: {
        packs: packs.length,
        scenarios: results.length,
        passed: results.filter((item) => item.valid).length,
        failed: results.filter((item) => !item.valid).length
      },
      results,
      guidance: "Pack scenario tests prove expected policy behavior without executing tools. They should run before publishing or modifying a policy pack."
    };
  }

  diff({ beforePackIds = ["ticketing-readonly"], afterPackIds = ["ticketing-write-approval"], scenario = DEFAULT_SCENARIO } = {}) {
    const before = this.runScenario({ packIds: beforePackIds, scenario, title: "Before policy" });
    const after = this.runScenario({ packIds: afterPackIds, scenario, title: "After policy" });
    return {
      runtimeVersion: "2.1.0",
      runtimeStage: "policy-test-lab",
      before: { selectedPolicyPacks: before.selectedPolicyPacks, summary: before.summary, decisions: before.decisions },
      after: { selectedPolicyPacks: after.selectedPolicyPacks, summary: after.summary, decisions: after.decisions },
      diff: comparePolicyOutcomes(before.decisions, after.decisions),
      guidance: "Use policy:diff to review whether a policy change makes the agent more permissive or more restrictive before release."
    };
  }
}
