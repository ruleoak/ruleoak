export type RuleOakPolicy = {
  allowedTools?: string[];
  blockedTools?: string[];
  approvalRequired?: string[];
  boundary?: string;
  metadata?: Record<string, unknown>;
};
export declare function normalizePolicy(policy?: Record<string, unknown>): RuleOakPolicy;
export declare function mergePolicies(policies?: RuleOakPolicy[]): RuleOakPolicy;
export declare class PolicyPack {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  policy: RuleOakPolicy;
  tools: unknown[];
  metadata: Record<string, unknown>;
  constructor(input?: Record<string, unknown>);
  static fromObject(value?: Record<string, unknown>): PolicyPack;
  static fromDirectory(directory: string): PolicyPack;
  toJSON(): Record<string, unknown>;
}
export declare class PolicyPackRegistry {
  constructor(input?: { packs?: PolicyPack[] });
  static fromDirectory(directory: string): PolicyPackRegistry;
  add(pack: PolicyPack | Record<string, unknown>): PolicyPack;
  get(id: string): PolicyPack | null;
  list(): Record<string, unknown>[];
  combine(ids: string[]): { packIds: string[]; policy: RuleOakPolicy; packs: Record<string, unknown>[] };
}
