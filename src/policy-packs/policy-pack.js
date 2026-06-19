import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const POLICY_PACK_SCHEMA_VERSION = "ruleoak.policy_pack.v1";
export const POLICY_PACK_PROTOCOL_VERSION = "ruleoak.governance.v1";
export const POLICY_PACK_LATEST_PUBLIC_CORE = "v2.1.0";
export const POLICY_PACK_EARLIER_BASELINE = "v1.0.1";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isSemver(value) {
  return typeof value === "string" && /^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/.test(value);
}

function decisionRank(decision) {
  if (decision === "allowed") return 1;
  if (decision === "approval_required") return 2;
  if (decision === "blocked") return 3;
  return 0;
}

function policyTools(policy = {}) {
  return {
    allowed: unique([...(policy.allowedTools || []), ...(policy.allowed_actions || [])]),
    approval_required: unique([...(policy.approvalRequired || []), ...(policy.approval_required || [])]),
    blocked: unique([...(policy.blockedTools || []), ...(policy.blocked_actions || [])])
  };
}

function defaultCompatibility() {
  return {
    policyPackSchema: POLICY_PACK_SCHEMA_VERSION,
    governanceProtocol: POLICY_PACK_PROTOCOL_VERSION,
    latestPublicCoreRelease: POLICY_PACK_LATEST_PUBLIC_CORE,
    earlierPublicBaseline: POLICY_PACK_EARLIER_BASELINE,
    developmentTrack: "RuleOak Core v2.1.0 release",
    supportsCoreMajor: ["2", "future-3"]
  };
}

export function normalizePolicy(policy = {}) {
  return {
    allowedTools: unique([...(policy.allowedTools || []), ...(policy.allowed_actions || [])]),
    blockedTools: unique([...(policy.blockedTools || []), ...(policy.blocked_actions || [])]),
    approvalRequired: unique([...(policy.approvalRequired || []), ...(policy.approval_required || [])]),
    boundary: policy.boundary || policy.boundary_level || "local_only",
    metadata: policy.metadata || {}
  };
}

export function mergePolicies(policies = []) {
  const merged = { allowedTools: [], blockedTools: [], approvalRequired: [], boundary: "local_only", metadata: { packs: [] } };
  for (const policy of policies.map(normalizePolicy)) {
    merged.allowedTools.push(...policy.allowedTools);
    merged.blockedTools.push(...policy.blockedTools);
    merged.approvalRequired.push(...policy.approvalRequired);
    if (policy.boundary && policy.boundary !== "local_only") merged.boundary = policy.boundary;
    if (policy.metadata?.packId) merged.metadata.packs.push(policy.metadata.packId);
  }
  // Deny has priority, then approval, then allow.
  const blocked = new Set(merged.blockedTools);
  const approval = new Set(merged.approvalRequired.filter((x) => !blocked.has(x)));
  const allowed = new Set(merged.allowedTools.filter((x) => !blocked.has(x) && !approval.has(x)));
  return { allowedTools: [...allowed], blockedTools: [...blocked], approvalRequired: [...approval], boundary: merged.boundary, metadata: merged.metadata };
}

export function validatePolicyPackManifest(value = {}) {
  const errors = [];
  const warnings = [];
  const required = ["schemaVersion", "id", "name", "version", "category", "description", "compatibility", "policy", "scenarioTests", "tools", "metadata"];
  for (const key of required) if (value[key] === undefined) errors.push(`missing required field: ${key}`);
  if (value.schemaVersion !== POLICY_PACK_SCHEMA_VERSION) errors.push(`schemaVersion must be ${POLICY_PACK_SCHEMA_VERSION}`);
  if (!value.id || !/^[a-z0-9][a-z0-9.-]*$/.test(value.id)) errors.push("id must be lowercase kebab/dot version-safe text");
  if (!isSemver(value.version)) errors.push("version must be semantic version x.y.z");
  const compatibility = value.compatibility || {};
  if (compatibility.policyPackSchema !== POLICY_PACK_SCHEMA_VERSION) errors.push(`compatibility.policyPackSchema must be ${POLICY_PACK_SCHEMA_VERSION}`);
  if (compatibility.governanceProtocol !== POLICY_PACK_PROTOCOL_VERSION) errors.push(`compatibility.governanceProtocol must be ${POLICY_PACK_PROTOCOL_VERSION}`);
  if (compatibility.latestPublicCoreRelease !== POLICY_PACK_LATEST_PUBLIC_CORE) errors.push(`compatibility.latestPublicCoreRelease must be ${POLICY_PACK_LATEST_PUBLIC_CORE}`);
  if (compatibility.earlierPublicBaseline && compatibility.earlierPublicBaseline !== POLICY_PACK_EARLIER_BASELINE) warnings.push(`earlierPublicBaseline is usually ${POLICY_PACK_EARLIER_BASELINE}`);
  const policy = normalizePolicy(value.policy || {});
  const seen = new Map();
  for (const [decision, tools] of Object.entries(policyTools(policy))) {
    for (const tool of tools) {
      if (!seen.has(tool)) seen.set(tool, []);
      seen.get(tool).push(decision);
    }
  }
  for (const [tool, decisions] of seen.entries()) {
    if (decisions.length > 1) warnings.push(`tool ${tool} appears in multiple policy effects: ${decisions.join(", ")}; RuleOak precedence is blocked > approval_required > allowed`);
  }
  const scenarios = asArray(value.scenarioTests);
  if (!scenarios.length) errors.push("scenarioTests must include at least one scenario");
  for (const scenario of scenarios) {
    if (!scenario.id) errors.push("scenarioTests[].id is required");
    if (!scenario.title) errors.push(`scenario ${scenario.id || "<unknown>"} title is required`);
    if (!asArray(scenario.calls).length) errors.push(`scenario ${scenario.id || "<unknown>"} must include calls`);
    for (const call of asArray(scenario.calls)) {
      if (!call.toolId) errors.push(`scenario ${scenario.id || "<unknown>"} call missing toolId`);
      if (!["allowed", "approval_required", "blocked"].includes(call.expectedDecision)) errors.push(`scenario ${scenario.id || "<unknown>"} call ${call.toolId || "<unknown>"} has invalid expectedDecision`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

function normalizeScenarioTests({ id, name, policy = {}, scenarioTests = [] } = {}) {
  if (asArray(scenarioTests).length) return scenarioTests;
  const tools = policyTools(policy);
  const calls = [
    ...tools.allowed.slice(0, 3).map((toolId) => ({ toolId, subject: `${id} scenario: ${toolId}`, expectedDecision: "allowed" })),
    ...tools.approval_required.slice(0, 3).map((toolId) => ({ toolId, subject: `${id} scenario: ${toolId}`, expectedDecision: "approval_required" })),
    ...tools.blocked.slice(0, 3).map((toolId) => ({ toolId, subject: `${id} scenario: ${toolId}`, expectedDecision: "blocked" }))
  ];
  return [{
    id: `${id}-default-scenario`,
    title: `${name || id} default scenario`,
    description: "Generated pack-local scenario for policy pack maturity checks. It evaluates declared allow, approval, and deny decisions without executing tools.",
    calls
  }];
}

export function explainPolicyWithProvenance(packs = []) {
  const provenance = new Map();
  for (const rawPack of packs) {
    const pack = rawPack instanceof PolicyPack ? rawPack : PolicyPack.fromObject(rawPack);
    const tools = policyTools(pack.policy);
    for (const [decision, toolIds] of Object.entries(tools)) {
      for (const toolId of toolIds) {
        if (!provenance.has(toolId)) provenance.set(toolId, { toolId, effects: [] });
        provenance.get(toolId).effects.push({ decision, packId: pack.id, packVersion: pack.version, category: pack.category });
      }
    }
  }
  const rows = [];
  for (const item of provenance.values()) {
    const ordered = [...item.effects].sort((a, b) => decisionRank(b.decision) - decisionRank(a.decision));
    const finalDecision = ordered[0]?.decision || "unknown";
    const conflicting = new Set(item.effects.map((effect) => effect.decision)).size > 1;
    rows.push({
      toolId: item.toolId,
      decision: finalDecision,
      reason: finalDecision === "blocked" ? "blocked by policy pack precedence" : finalDecision === "approval_required" ? "approval required by policy pack precedence" : "allowed by policy pack precedence",
      precedence: "blocked > approval_required > allowed",
      packIds: ordered.map((effect) => effect.packId),
      effects: ordered,
      conflictingEffects: conflicting
    });
  }
  return rows.sort((a, b) => a.toolId.localeCompare(b.toolId));
}

function setDiff(before = [], after = []) {
  const b = new Set(before);
  const a = new Set(after);
  return {
    added: [...a].filter((x) => !b.has(x)).sort(),
    removed: [...b].filter((x) => !a.has(x)).sort(),
    unchanged: [...a].filter((x) => b.has(x)).sort()
  };
}

export function diffPolicyPackManifests(before = {}, after = {}) {
  const beforePolicy = normalizePolicy(before.policy || {});
  const afterPolicy = normalizePolicy(after.policy || {});
  const policyDiff = {
    allowedTools: setDiff(beforePolicy.allowedTools, afterPolicy.allowedTools),
    approvalRequired: setDiff(beforePolicy.approvalRequired, afterPolicy.approvalRequired),
    blockedTools: setDiff(beforePolicy.blockedTools, afterPolicy.blockedTools),
    boundaryChanged: beforePolicy.boundary !== afterPolicy.boundary ? { before: beforePolicy.boundary, after: afterPolicy.boundary } : null
  };
  const beforeExplain = explainPolicyWithProvenance([{ ...before, policy: beforePolicy }]);
  const afterExplain = explainPolicyWithProvenance([{ ...after, policy: afterPolicy }]);
  const afterByTool = new Map(afterExplain.map((item) => [item.toolId, item]));
  const decisionChanges = [];
  for (const beforeRow of beforeExplain) {
    const afterRow = afterByTool.get(beforeRow.toolId);
    if (!afterRow || beforeRow.decision === afterRow.decision) continue;
    decisionChanges.push({ toolId: beforeRow.toolId, before: beforeRow.decision, after: afterRow.decision, direction: decisionRank(afterRow.decision) > decisionRank(beforeRow.decision) ? "more_restrictive" : "less_restrictive" });
  }
  return {
    before: { id: before.id || null, version: before.version || null },
    after: { id: after.id || null, version: after.version || null },
    manifest: {
      schemaVersionChanged: before.schemaVersion !== after.schemaVersion,
      versionChanged: before.version !== after.version,
      compatibilityChanged: JSON.stringify(before.compatibility || {}) !== JSON.stringify(after.compatibility || {})
    },
    policy: policyDiff,
    scenarioTests: {
      beforeCount: asArray(before.scenarioTests).length,
      afterCount: asArray(after.scenarioTests).length
    },
    decisionChanges
  };
}

export class PolicyPack {
  constructor({ schemaVersion = POLICY_PACK_SCHEMA_VERSION, id, name, version = "1.0.0", description = "", category = "general", compatibility = defaultCompatibility(), policy = {}, scenarioTests = [], tools = [], metadata = {} } = {}) {
    if (!id) throw new Error("PolicyPack requires id");
    this.schemaVersion = schemaVersion;
    this.id = id;
    this.name = name || id;
    this.version = version;
    this.description = description;
    this.category = category;
    this.compatibility = { ...defaultCompatibility(), ...(compatibility || {}) };
    this.policy = normalizePolicy({ ...policy, metadata: { ...(policy.metadata || {}), packId: id } });
    this.scenarioTests = normalizeScenarioTests({ id, name: this.name, policy: this.policy, scenarioTests });
    this.tools = tools;
    this.metadata = metadata;
    this.validation = validatePolicyPackManifest(this.toJSON());
  }

  static fromObject(value = {}) {
    return new PolicyPack(value);
  }

  static fromDirectory(directory) {
    const manifestPath = join(directory, "pack.json");
    if (!existsSync(manifestPath)) throw new Error(`Policy pack manifest not found: ${manifestPath}`);
    return PolicyPack.fromObject(JSON.parse(readFileSync(manifestPath, "utf8")));
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      name: this.name,
      version: this.version,
      category: this.category,
      description: this.description,
      compatibility: this.compatibility,
      policy: this.policy,
      scenarioTests: this.scenarioTests,
      tools: this.tools,
      metadata: this.metadata
    };
  }
}

export class PolicyPackRegistry {
  constructor({ packs = [] } = {}) {
    this.packs = new Map();
    for (const pack of packs) this.add(pack);
  }

  static fromDirectory(directory) {
    const registry = new PolicyPackRegistry();
    if (!existsSync(directory)) return registry;
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const packDir = join(directory, name.name);
      if (existsSync(join(packDir, "pack.json"))) registry.add(PolicyPack.fromDirectory(packDir));
    }
    return registry;
  }

  add(pack) {
    const normalized = pack instanceof PolicyPack ? pack : PolicyPack.fromObject(pack);
    this.packs.set(normalized.id, normalized);
    return normalized;
  }

  get(id) {
    return this.packs.get(id) || null;
  }

  list() {
    return [...this.packs.values()].map((pack) => pack.toJSON());
  }

  combine(ids = []) {
    const selected = ids.map((id) => {
      const pack = this.get(id);
      if (!pack) throw new Error(`Unknown policy pack: ${id}`);
      return pack;
    });
    return {
      schemaVersion: POLICY_PACK_SCHEMA_VERSION,
      packIds: selected.map((p) => p.id),
      policy: mergePolicies(selected.map((p) => p.policy)),
      packs: selected.map((p) => p.toJSON()),
      explain: explainPolicyWithProvenance(selected)
    };
  }

  explain(ids = []) {
    const selectedIds = ids.length ? ids : this.list().map((pack) => pack.id);
    return this.combine(selectedIds).explain;
  }

  validateAll() {
    const packs = [...this.packs.values()].map((pack) => {
      const validation = validatePolicyPackManifest(pack.toJSON());
      return { id: pack.id, version: pack.version, schemaVersion: pack.schemaVersion, valid: validation.valid, errors: validation.errors, warnings: validation.warnings };
    });
    return {
      schemaVersion: POLICY_PACK_SCHEMA_VERSION,
      checkedAt: new Date(0).toISOString(),
      summary: {
        total: packs.length,
        valid: packs.filter((pack) => pack.valid).length,
        invalid: packs.filter((pack) => !pack.valid).length,
        warnings: packs.reduce((total, pack) => total + pack.warnings.length, 0)
      },
      packs
    };
  }

  compatibilityMatrix() {
    const packs = [...this.packs.values()].map((pack) => ({
      id: pack.id,
      version: pack.version,
      category: pack.category,
      schemaVersion: pack.schemaVersion,
      governanceProtocol: pack.compatibility?.governanceProtocol || null,
      latestPublicCoreRelease: pack.compatibility?.latestPublicCoreRelease || null,
      earlierPublicBaseline: pack.compatibility?.earlierPublicBaseline || null,
      developmentTrack: pack.compatibility?.developmentTrack || null,
      scenarioTestCount: pack.scenarioTests.length,
      status: pack.metadata?.status || "unknown"
    }));
    return {
      schemaVersion: POLICY_PACK_SCHEMA_VERSION,
      latestPublicCoreRelease: POLICY_PACK_LATEST_PUBLIC_CORE,
      guidance: "Policy packs are versioned governance assets. Public docs should keep v2.1.0 as the latest released Core until a future future major release is intentionally published.",
      packs
    };
  }
}
