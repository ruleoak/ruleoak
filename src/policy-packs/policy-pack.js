import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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

export class PolicyPack {
  constructor({ id, name, version = "1.0.0", description = "", category = "general", policy = {}, tools = [], metadata = {} } = {}) {
    if (!id) throw new Error("PolicyPack requires id");
    this.id = id;
    this.name = name || id;
    this.version = version;
    this.description = description;
    this.category = category;
    this.policy = normalizePolicy({ ...policy, metadata: { ...(policy.metadata || {}), packId: id } });
    this.tools = tools;
    this.metadata = metadata;
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
    return { id: this.id, name: this.name, version: this.version, description: this.description, category: this.category, policy: this.policy, tools: this.tools, metadata: this.metadata };
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
      packIds: selected.map((p) => p.id),
      policy: mergePolicies(selected.map((p) => p.policy)),
      packs: selected.map((p) => p.toJSON())
    };
  }
}
