export declare const POLICY_PACK_SCHEMA_VERSION: "ruleoak.policy_pack.v1";
export declare const POLICY_PACK_PROTOCOL_VERSION: "ruleoak.governance.v1";
export declare const POLICY_PACK_LATEST_PUBLIC_CORE: "v2.0.3";
export declare const POLICY_PACK_EARLIER_BASELINE: "v1.0.1";

export type RuleOakPolicy = {
  allowedTools?: string[];
  blockedTools?: string[];
  approvalRequired?: string[];
  boundary?: string;
  metadata?: Record<string, unknown>;
};

export type PolicyPackValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export declare function normalizePolicy(policy?: Record<string, unknown>): RuleOakPolicy;
export declare function mergePolicies(policies?: RuleOakPolicy[]): RuleOakPolicy;
export declare function validatePolicyPackManifest(value?: Record<string, unknown>): PolicyPackValidation;
export declare function explainPolicyWithProvenance(packs?: Array<PolicyPack | Record<string, unknown>>): Array<Record<string, unknown>>;
export declare function diffPolicyPackManifests(before?: Record<string, unknown>, after?: Record<string, unknown>): Record<string, unknown>;

export declare class PolicyPack {
  schemaVersion: string;
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  compatibility: Record<string, unknown>;
  policy: RuleOakPolicy;
  scenarioTests: unknown[];
  tools: unknown[];
  metadata: Record<string, unknown>;
  validation: PolicyPackValidation;
  constructor(input?: Record<string, unknown>);
  static fromObject(value?: Record<string, unknown>): PolicyPack;
  static fromDirectory(directory: string): PolicyPack;
  toJSON(): Record<string, unknown>;
}

export declare class PolicyPackRegistry {
  constructor(input?: { packs?: Array<PolicyPack | Record<string, unknown>> });
  static fromDirectory(directory: string): PolicyPackRegistry;
  add(pack: PolicyPack | Record<string, unknown>): PolicyPack;
  get(id: string): PolicyPack | null;
  list(): Record<string, unknown>[];
  combine(ids: string[]): { schemaVersion: string; packIds: string[]; policy: RuleOakPolicy; packs: Record<string, unknown>[]; explain: Array<Record<string, unknown>> };
  explain(ids?: string[]): Array<Record<string, unknown>>;
  validateAll(): Record<string, unknown>;
  compatibilityMatrix(): Record<string, unknown>;
}
