export type PolicyDecisionName = "allowed" | "approval_required" | "blocked";

export interface PolicyScenarioCall {
  toolId?: string;
  tool?: string;
  name?: string;
  action?: string;
  subject?: string | null;
  expectedDecision?: PolicyDecisionName;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyScenario {
  id?: string;
  title?: string;
  description?: string;
  calls: PolicyScenarioCall[];
}

export interface PolicyTestLabOptions {
  rootDir?: string;
  policyPackDir?: string;
  toolManifest?: unknown;
  actor?: string;
}

export class PolicyTestLab {
  constructor(options?: PolicyTestLabOptions);
  listPacks(): unknown[];
  combinePacks(packIds: string[]): unknown;
  runScenario(options: { packIds?: string[]; scenario: PolicyScenario; title?: string }): unknown;
  explain(packIds?: string[]): unknown;
  diff(options?: { beforePackIds?: string[]; afterPackIds?: string[]; scenario?: PolicyScenario }): unknown;
}

export function normalizeScenario(scenario: PolicyScenario): PolicyScenario;
export function summarizeOutcomes(decisions: unknown[]): unknown;
export function comparePolicyOutcomes(beforeDecisions: unknown[], afterDecisions: unknown[]): unknown;
