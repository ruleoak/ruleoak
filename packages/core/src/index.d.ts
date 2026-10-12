// SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type {
  ActionEnvelope,
  ApprovalRequest,
  ApprovalResult,
  AuthorityGrant,
  AuthorityCapability,
  AuthorityPrincipal,
  DataFlow,
  DecisionReceipt,
  NormalizedToolCall,
  Policy,
  RiskLevel,
  SideEffect
} from '@ruleoak/protocol';

export const DECISION: Readonly<{
  ALLOW: 'allow';
  DENY: 'deny';
  NEEDS_APPROVAL: 'needs_approval';
  DRY_RUN_ONLY: 'dry_run_only';
}>;

export interface PolicyDecision {
  action: 'allow' | 'deny' | 'needs_approval' | 'dry_run_only';
  reason: string;
  matchedRule?: string | null;
  matchedRules?: string[];
  matchedPattern?: string | null;
  specificity?: number;
  priority?: number;
  allowCritical?: boolean;
  trace?: Array<Record<string, unknown>>;
  receipt?: DecisionReceipt;
  [key: string]: unknown;
}

export interface RiskClassification {
  risk: RiskLevel;
  reasons: string[];
  detectedSecrets: boolean;
  detectedPromptInjection: boolean;
  secretExfiltrationRisk: boolean;
  promptInjectionSideEffectRisk: boolean;
  dataFlow: DataFlow;
  sideEffect: SideEffect;
  untrustedInput: boolean;
}

export interface PermissionResult {
  normalizedCall: NormalizedToolCall;
  action: ActionEnvelope;
  classification: RiskClassification;
  decision: PolicyDecision & { receipt: DecisionReceipt };
}

export class RuleOakPolicyValidationError extends Error {
  errors: string[];
}

export function assertValidPolicy(policy: Policy): true;
export function normalizePolicy(policy?: Policy): Policy;
export function actionKey(action: ActionEnvelope): string;
export function patternSpecificity(pattern: string): number;
export function matchesPattern(pattern: string, key: string): boolean;
export function matchesResourcePattern(pattern: string, resource?: string): boolean;
export function evaluatePolicy(action: ActionEnvelope, policy?: Policy): PolicyDecision;

export class RuleOakEngine {
  constructor(policy?: Policy);
  policy: Policy;
  evaluate(action: ActionEnvelope): PolicyDecision;
}

export interface PolicyLintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  notes: string[];
  summary: Record<string, number>;
}
export function lintPolicy(policy?: Policy): PolicyLintResult;

export function classifyRisk(call: NormalizedToolCall): RiskClassification;
export function classifyDataFlow(call?: Partial<NormalizedToolCall>): DataFlow;
export function classifySideEffect(call?: Partial<NormalizedToolCall>): SideEffect;
export function containsPromptInjection(value: unknown): boolean;
export function normalizeToolCall(input: unknown, options?: Record<string, unknown>): NormalizedToolCall;
export function actionFromNormalizedToolCall(call: NormalizedToolCall, redactedArguments?: Record<string, unknown>): ActionEnvelope;
export function evaluatePermissionRequest(input: unknown, policy?: Policy, options?: {
  sessionId?: string;
  sessionDecisionCache?: Record<string, unknown>;
  sessionDecisions?: Record<string, unknown>;
  evaluatedAt?: string;
  receiptTtlMs?: number;
  receiptSecret?: string;
  receiptAudience?: string;
  receiptIssuer?: string;
  receiptOneTime?: boolean;
  [key: string]: unknown;
}): PermissionResult;

export function approvalFingerprint(call?: Partial<NormalizedToolCall>): string;
export function approvalSummary(call?: Partial<NormalizedToolCall>): string;
export function applySessionDecision(decision: PolicyDecision, call: NormalizedToolCall, cache?: Record<string, unknown>): PolicyDecision;

export function redactString(value: unknown): string;
export function redactValue(value: unknown, key?: string): unknown;
export function redactObject(value?: Record<string, unknown>): Record<string, unknown>;
export function containsSecretLike(value: unknown): boolean;

export function canonicalStringify(value: unknown): string;
export function canonicalDigest(value: unknown): string;
export function actionDigest(input: unknown, options?: Record<string, unknown>): string;
export function policyDigest(policy?: Policy): string;
export function buildDecisionReceipt(result: PermissionResult, policy?: Policy, options?: { evaluatedAt?: string; ttlMs?: number; secret?: string; decisionId?: string; nonce?: string; issuer?: string; audience?: string; oneTime?: boolean; notBefore?: string }): DecisionReceipt;
export function signDecisionReceipt(receipt: DecisionReceipt, secret: string): DecisionReceipt;
export function verifyDecisionReceipt(receipt: DecisionReceipt, options?: { now?: Date | string; input?: unknown; policy?: Policy; secret?: string; requireAllow?: boolean; requireSignature?: boolean; audience?: string }): { ok: boolean; errors: string[]; receipt: DecisionReceipt };
export function verifyExecutionGrant(receipt: DecisionReceipt, input: unknown, policy: Policy, secret: string | undefined, options?: { now?: Date | string; requireSignature?: boolean; audience?: string }): { ok: boolean; errors: string[]; receipt: DecisionReceipt };

export interface ExecutionGrantConsumption {
  ok: boolean;
  consumed: boolean;
  replayed: boolean;
  errors: string[];
  receipt: DecisionReceipt;
  markerPath?: string;
  marker?: Record<string, unknown>;
  existing?: Record<string, unknown>;
}
export function executionGrantMarkerPath(storeDir: string, receipt: DecisionReceipt): string;
export function listConsumedExecutionGrants(storeDir: string): Array<Record<string, unknown>>;
export function consumeExecutionGrant(receipt: DecisionReceipt, input: unknown, policy: Policy, secret: string | undefined, options: { storeDir: string; now?: Date | string; consumedAt?: Date | string; executor?: string; audience?: string; requireSignature?: boolean }): ExecutionGrantConsumption;
export class ExecutionGrantConsumer {
  constructor(options: { storeDir: string; secret?: string; requireSignature?: boolean; audience?: string; executor?: string });
  consume(receipt: DecisionReceipt, input: unknown, policy: Policy, options?: Record<string, unknown>): ExecutionGrantConsumption;
  list(): Array<Record<string, unknown>>;
}


export function authorityPatternMatches(pattern: string, value: string): boolean;
export function authorityPatternIsWithin(childPattern: string, parentPattern: string): boolean;
export function canonicalResourceIdentity(input: unknown, options?: Record<string, unknown>): string;
export function canonicalActionVocabulary(input: unknown, options?: Record<string, unknown>): string;
export function buildAuthorityGrant(spec: Partial<AuthorityGrant> & { subject?: AuthorityPrincipal | string; capabilities: AuthorityCapability[] }, options?: { issuedAt?: string; now?: Date | string; ttlMs?: number; notBefore?: string; grantId?: string; issuer?: string; subject?: AuthorityPrincipal | string; secret?: string }): AuthorityGrant;
export function signAuthorityGrant(grant: AuthorityGrant, secret: string): AuthorityGrant;
export function verifyAuthorityGrant(grant: AuthorityGrant, options?: { now?: Date | string; secret?: string; requireSignature?: boolean; expectedSubjectId?: string; expectedSessionId?: string; revocationRegistry?: RevocationRegistry; revocationAssumeLocked?: boolean }): { ok: boolean; errors: string[]; grant: AuthorityGrant };
export function isAuthorityGrantAttenuated(parent: AuthorityGrant, child: AuthorityGrant): { ok: boolean; errors: string[] };
export function delegateAuthorityGrant(parent: AuthorityGrant, spec: Partial<AuthorityGrant> & { subject: AuthorityPrincipal | string; capabilities: AuthorityCapability[] }, secret?: string, options?: { now?: Date | string; requireSignature?: boolean; revocationRegistry?: RevocationRegistry; budgetRegistry?: DelegationBudgetRegistry }): AuthorityGrant;
export function authorizeWithAuthorityGrant(grant: AuthorityGrant, input: unknown, options?: { secret?: string; requireSignature?: boolean; bindSubject?: boolean; now?: Date | string; revocationRegistry?: RevocationRegistry; revocationAssumeLocked?: boolean }): { ok: boolean; errors: string[]; grant: AuthorityGrant; canonicalAction: string; canonicalResource: string; matchedCapability: AuthorityCapability | null };

export const APPROVAL_PROVIDER_API_VERSIONS: readonly ['1.0','1.1'];
export const APPROVAL_PROVIDER_API_VERSION: '1.1';
export const APPROVAL_DECISIONS: readonly string[];
export interface ApprovalProvider { apiVersion: '1.0'|'1.1'; providerId?:string; name: string; request(request: ApprovalRequest, context?: Record<string, unknown>): unknown | Promise<unknown>; list?(context?: Record<string, unknown>): unknown | Promise<unknown>; decide?(approvalId: string, decision: string, context?: Record<string, unknown>): unknown | Promise<unknown>; }
export function buildApprovalRequest(result: PermissionResult, options?: Record<string, unknown>): ApprovalRequest;
export function approvalRequestDigest(request:ApprovalRequest):string;
export function approvalResultDigest(result:ApprovalResult):string;
export function verifyApprovalRequest(request:ApprovalRequest,options?:Record<string,unknown>):{ok:boolean;errors:string[];request:ApprovalRequest};
export function buildApprovalResult(request:ApprovalRequest,decision:string,options:Record<string,unknown>):ApprovalResult;
export function signApprovalResult(result:ApprovalResult,secret:string):ApprovalResult;
export function verifyApprovalResult(result:ApprovalResult,request:ApprovalRequest,options?:Record<string,unknown>):{ok:boolean;errors:string[];result:ApprovalResult;request:ApprovalRequest};
export function applyApprovalResult(result:PermissionResult,request:ApprovalRequest,approvalResult:ApprovalResult,policy?:Policy,options?:Record<string,unknown>):PermissionResult & {approval:ApprovalRequest;approval_result:ApprovalResult};
export function consumeApprovalResultForLease(request:ApprovalRequest,result:ApprovalResult,options:Record<string,unknown>):Record<string,unknown>;
export function verifyApprovalUseBinding(use:Record<string,unknown>,request:ApprovalRequest,result:ApprovalResult,options?:Record<string,unknown>):{ok:boolean;errors:string[];use:Record<string,unknown>};
export function validateApprovalProvider(provider: unknown): { valid: boolean; errors: string[] };
export class ApprovalBroker { constructor(provider: ApprovalProvider); provider: ApprovalProvider; request(result: PermissionResult, options?: Record<string, unknown>): Promise<Record<string, unknown>>; decide(approvalId: string, decision: string, options?: Record<string, unknown>): Promise<unknown>; list(options?: Record<string, unknown>): Promise<unknown>; }
export class MemoryApprovalProvider implements ApprovalProvider { constructor(options?: { name?: string;providerId?:string;secret?:string;approver?:Record<string,unknown> }); apiVersion: '1.1'; providerId:string; name: string; request(request: ApprovalRequest): unknown; list(): unknown[]; decide(approvalId: string, decision: string): ApprovalResult; }

export function detectPolicyVersion(policy?: Policy): 1 | 2;
export function migratePolicyToV2(policy?: Policy, options?: { idPrefix?: string; migratedAt?: string }): { changed: boolean; fromVersion: 1 | 2; toVersion: 2; policy: Policy; warnings: string[]; summary: Record<string, number> };

export const GENESIS_HASH: 'GENESIS';
/** @deprecated Use canonicalStringify instead. Emits RULEOAK_DEP_STABLE_STRINGIFY once per process. */
export function stableStringify(value: unknown): string;
export function eventHash(previousHash: string, eventWithoutHash: unknown): string;
export class EvidenceRecorder {
  constructor(filePath: string, options?: { fsync?: boolean });
  filePath: string;
  readEvents(): Array<Record<string, unknown>>;
  readLastEvent(): Record<string, unknown> | null;
  append(action: ActionEnvelope, decision: PolicyDecision, timestamp?: string): Record<string, unknown>;
}
export class RuleOakFlightRecorder extends EvidenceRecorder {
  writeEvent(action: ActionEnvelope, decision: PolicyDecision, matchedRule?: string | null, timestamp?: string): Record<string, unknown>;
}
export function verifyEvidence(events: Array<Record<string, unknown>>): { ok: boolean; errors: string[]; count: number };

export function defaultPolicy(projectRoot?: string): Policy;
export function resolvePolicyPath(projectRoot?: string, explicitPolicyPath?: string): string;

export interface AdapterOptions {
  actor?: Partial<NormalizedToolCall['actor']>;
  actorType?: string;
  actorName?: string;
  agentId?: string;
  agentIssuer?: string;
  sessionId?: string;
  callId?: string;
  timestamp?: string;
  scope?: string;
  sensitivity?: string;
  category?: string;
  operation?: string;
  target?: string;
  adapter?: 'authorization' | 'openai' | 'mcp' | 'http' | string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  policy?: Policy;
  authorityGrant?: AuthorityGrant;
  authoritySecret?: string;
  requireAuthoritySignature?: boolean;
  bindAuthoritySubject?: boolean;
  onApproval?: (result: PermissionResult) => string | { action?: string; decision?: string } | Promise<string | { action?: string; decision?: string }>;
  onDecision?: (result: PermissionResult) => unknown | Promise<unknown>;
  executors?: Record<string, (...args: any[]) => any>;
  [key: string]: unknown;
}
export function adaptAuthorizationRequest(request?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
export function adaptOpenAIToolCall(payload?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
export function adaptMcpToolCall(payload?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
export function adaptShellCommand(command: string, args?: string[], options?: AdapterOptions): NormalizedToolCall;
export function adaptFilesystemAction(operation: string, path: string, args?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
export function adaptHttpAction(request?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
export function adaptAction(input: unknown, options?: AdapterOptions): unknown;
export function authorize(request: unknown, options?: AdapterOptions): PermissionResult;
export class RuleOakAuthorizationError extends Error { constructor(result: PermissionResult); result: PermissionResult; }
export function guardFunction<T extends (...args: any[]) => any>(fn: T, descriptor?: Record<string, any>, options?: AdapterOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export function guardTools<T>(tools: T, options?: AdapterOptions): T;

export const RULEOAK_RESULT_METADATA: unique symbol;
export interface RuleOakExecutionMetadata {
  decision_id: string | null;
  evidence_event_id: string | null;
  action_digest: string | null;
  policy_digest: string | null;
  consumed: boolean;
  consumption_record: string | null;
}
export function getRuleOakMetadata(value: unknown): RuleOakExecutionMetadata | null;
export class RuleOakApprovalRequiredError extends RuleOakAuthorizationError {
  code: 'RULEOAK_APPROVAL_REQUIRED';
  approvalId: string | null;
}
export interface CreateRuleOakOptions extends AdapterOptions {
  workspace?: string;
  policy?: Policy;
  approvalProvider?: ApprovalProvider;
  receiptMode?: 'automatic' | 'manual' | 'off';
  receiptSecret?: string;
  receiptAudience?: string;
  receiptIssuer?: string;
  evidenceFile?: string;
  fsyncEvidence?: boolean;
  resultMode?: 'preserve' | 'envelope';
  onExecution?: (metadata: RuleOakExecutionMetadata, authorization: PermissionResult, value: unknown) => unknown | Promise<unknown>;
}
export interface RuleOakRuntime {
  workspace: string;
  policy: Policy;
  evidenceFile: string;
  receiptMode: 'automatic' | 'manual' | 'off';
  authorize(input: unknown, options?: AdapterOptions): Promise<PermissionResult & { approval?: Record<string, unknown> | null; evidence: { initial_event_id: string; final_event_id: string; evidence_file: string } }>;
  consume(result: PermissionResult, input: unknown, options?: Record<string, unknown>): ExecutionGrantConsumption & { skipped?: boolean };
  guardFunction<TArgs extends any[], TResult>(descriptor: {
    name: string;
    operation?: string;
    category?: string;
    resource?: string | ((args: TArgs) => string);
    target?: string;
    scope?: string;
    sensitivity?: string;
    execute: (...args: TArgs) => TResult | Promise<TResult>;
    mapArguments?: (args: TArgs) => Record<string, unknown>;
    buildRequest?: (args: TArgs) => unknown | Promise<unknown>;
    resultMode?: 'preserve' | 'envelope';
    [key: string]: unknown;
  }): (...args: TArgs) => Promise<Awaited<TResult>>;
  guardTools<T>(tools: T, options?: AdapterOptions & { resultMode?: 'preserve' | 'envelope' }): T;
  adapters: {
    authorization(request: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
    openai(call: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
    mcp(call: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
    shell(command: string, args?: string[], options?: AdapterOptions): NormalizedToolCall;
    filesystem(operation: string, path: string, args?: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
    http(request: Record<string, unknown>, options?: AdapterOptions): NormalizedToolCall;
  };
  authorizeOpenAIToolCall(call: Record<string, unknown>, options?: AdapterOptions): ReturnType<RuleOakRuntime['authorize']>;
  authorizeMcpToolCall(call: Record<string, unknown>, options?: AdapterOptions): ReturnType<RuleOakRuntime['authorize']>;
  readonly lastExecution: RuleOakExecutionMetadata | null;
}
export function createRuleOak(options?: CreateRuleOakOptions): Promise<RuleOakRuntime>;


export interface AuthorityEnvelope { envelope_version:'1.0'; envelope_id:string; grant_id:string; principal_chain:AuthorityPrincipal[]; capabilities:AuthorityCapability[]; issued_at:string; not_before:string; expires_at:string; constraints:Record<string,unknown>; obligations:Array<Record<string,unknown>>; signature?:string; }
export interface ExecutionLease { lease_version:'1.0'|'1.1'|'1.2'; lease_id:string; decision_id:string; principal_id:string; authority_envelope_id:string|null; authority_grant_id:string|null; action_digest:string; policy_digest:string; canonical_action:string; canonical_resource:string; issued_at:string; not_before:string; expires_at:string; max_uses:1; authority_ancestor_grant_ids?:string[]; authority_principal_ids?:string[]; budget?:Record<string,number>; obligations?:Array<Record<string,unknown>>; nonce:string; signature?:string; }
export type LegacyObservationQuality='complete-for-adapter'|'partial'|'inferred'|'unavailable';
export type ObservationQuality='requested_only'|'process_return_observed'|'local_state_observed'|'remote_response_observed'|'complete_for_adapter'|'partial'|'ambiguous';
export interface EffectReceipt { effect_version:'1.0'|'1.1'; effect_id:string; lease_id:string; decision_id:string; adapter:string; adapter_contract_version?:'1.1'; started_at:string; completed_at:string; status:'success'|'failure'|'partial'|'unknown'; observation_quality:LegacyObservationQuality|ObservationQuality; observation_boundary?:string; requested?:Record<string,unknown>; observed:Record<string,unknown>; error?:Record<string,unknown>|null; signature?:string; }
export const REVOCATION_SUBJECT_TYPES: readonly ['principal','authority_grant','authority_envelope','execution_lease','session'];
export class RevocationRegistry { constructor(options?:{filePath?:string}); filePath:string|null; withExclusive<T>(fn:()=>T):T; revoke(type:string,id:string,options?:{now?:Date|string;revokedAt?:Date|string;reason?:string;cascade?:boolean;parentId?:string;revocationId?:string}):Record<string,unknown>; isRevoked(type:string,id:string,options?:{now?:Date|string;at?:Date|string;ancestors?:Array<string|{type?:string|null;id:string}>;assumeLocked?:boolean}):{revoked:boolean;record:Record<string,unknown>|null;via:'direct'|'cascade'|null}; list(options?:{assumeLocked?:boolean}):Array<Record<string,unknown>>; }
export function buildAuthorityEnvelope(grant:AuthorityGrant,spec?:Record<string,unknown>,options?:Record<string,unknown>):AuthorityEnvelope;
export function signAuthorityEnvelope(envelope:AuthorityEnvelope,secret:string):AuthorityEnvelope;
export function verifyAuthorityEnvelope(envelope:AuthorityEnvelope,options?:Record<string,unknown>):{ok:boolean;errors:string[];envelope:AuthorityEnvelope};
export function authorizeWithAuthorityEnvelope(envelope:AuthorityEnvelope,input:unknown,options?:Record<string,unknown>):Record<string,unknown>;
export const AUTHORITY_BUDGET_FIELDS: readonly string[];
export function normalizeAuthorityBudget(input?:Record<string,number>):Record<string,number>;
export function inheritAuthorityBudget(parent?:Record<string,number>,requested?:Record<string,number>):Record<string,number>;
export function addAuthorityBudgets(left?:Record<string,number>,right?:Record<string,number>):Record<string,number>;
export class DelegationBudgetRegistry { constructor(options?:{filePath?:string}); filePath:string|null; list():Array<Record<string,unknown>>; reserve(parentGrant:AuthorityGrant,childGrant:AuthorityGrant,options?:{allocatedAt?:Date|string;now?:Date|string}):{reserved:boolean;duplicate:boolean;record:Record<string,unknown>}; }
export function budgetIsWithin(child?:Record<string,number>,parent?:Record<string,number>):{ok:boolean;errors:string[]};
export function evaluateAuthorityBudget(budget?:Record<string,number>,usage?:Record<string,number>):{ok:boolean;errors:string[]};
export function normalizeObligations(obligations?:Array<Record<string,unknown>>):Array<Record<string,unknown>>;
export function evaluateObligations(obligations?:Array<Record<string,unknown>>,context?:Record<string,unknown>,phase?:'pre'|'post'):Record<string,unknown>;
export function buildExecutionLease(result:PermissionResult,policy?:Policy,options?:Record<string,unknown>):ExecutionLease;
export function issueExecutionLease(result:PermissionResult,policy?:Policy,options?:Record<string,unknown>):ExecutionLease;
export function signExecutionLease(lease:ExecutionLease,secret:string):ExecutionLease;
export function verifyExecutionLease(lease:ExecutionLease,input:unknown,policy?:Policy,options?:Record<string,unknown>):Record<string,unknown>;
export function consumeExecutionLease(lease:ExecutionLease,input:unknown,policy?:Policy,options?:Record<string,unknown>):Record<string,unknown>;
export function buildEffectReceipt(lease:ExecutionLease,outcome?:Record<string,unknown>,options?:Record<string,unknown>):EffectReceipt;
export function signEffectReceipt(receipt:EffectReceipt,secret:string):EffectReceipt;
export function verifyEffectReceipt(receipt:EffectReceipt,options?:Record<string,unknown>):Record<string,unknown>;
export class RuleOakAuthorityLedger { constructor(recorderOrPath:EvidenceRecorder|string,options?:Record<string,unknown>); append(eventType:string,payload?:Record<string,unknown>,timestamp?:string):Record<string,unknown>; }
export const MCP_PROTOCOL_2026_07_28:'2026-07-28';
export const MCP_PROTOCOL_2025_06_18:'2025-06-18';
export function inspectMcpRequest(input?:{headers?:Record<string,unknown>;body?:Record<string,unknown>}):Record<string,unknown>;
export interface McpCapabilityPin { pin_version:'1.0'; fingerprint:string; identity:Record<string,unknown>; created_at:string; expires_at:string; tools:Array<{name:string;schema_digest:string|null}>; }
export function buildMcpCapabilityPin(manifest:CapabilityManifest,options?:{createdAt?:string|Date;ttlMs?:number}):McpCapabilityPin;
export function verifyMcpToolCallAgainstPin(payload:Record<string,unknown>,pin:McpCapabilityPin,options?:{now?:string|Date;currentManifest?:CapabilityManifest}):{ok:boolean;errors:string[];name:string;pin:McpCapabilityPin};

export type CapabilityIdentity = import('@ruleoak/protocol').CapabilityIdentity;
export type CapabilityEvidence = import('@ruleoak/protocol').CapabilityEvidence;
export interface CapabilityTool extends Record<string,unknown> { name:string; capability_id?:string; capability_identity?:CapabilityIdentity; evidence?:CapabilityEvidence; state:'read_only'|'state_changing'|'unknown'; consequence:'read_only'|'high_consequence'|'destructive'|'unknown'; schema_digest:string; classification_basis?:Record<string,unknown>; }
export interface CapabilityManifest { manifest_version:'1.0'|'1.1'|'1.2'; identity:Record<string,unknown>&{name:string;integration_id?:string;identity_basis?:import('@ruleoak/protocol').CapabilityIdentityBasis}; provenance?:Record<string,unknown>; tools:CapabilityTool[]; summary:Record<string,number>; trust_notes?:string[]; fingerprint:string; }
export function classifyToolCapability(tool?:Record<string,unknown>):Record<string,unknown>;
export function buildCapabilityIdentity(input?:Record<string,unknown>,options?:Record<string,unknown>):CapabilityIdentity;
export function buildCapabilityEvidence(input?:Record<string,unknown>,options?:Record<string,unknown>):CapabilityEvidence;
export function sanitizePublicCapabilityIdentity(identity?:Partial<CapabilityIdentity>):CapabilityIdentity;
export function sanitizePublicCapabilityEvidence(evidence?:Partial<CapabilityEvidence>):CapabilityEvidence;
export function capabilitySurfaceFingerprintPayload(manifest?:CapabilityManifest):Record<string,unknown>;
export function capabilitySurfaceFingerprint(manifest?:CapabilityManifest):string;
export function migrateCapabilityManifestToV12(manifest?:CapabilityManifest,options?:{observedAt?:string;identityKey?:string}):CapabilityManifest;
export type CapabilityObservation = import('@ruleoak/protocol').CapabilityObservation;
export type CapabilityLifecycleState = import('@ruleoak/protocol').CapabilityLifecycleState;
export type CapabilityDriftCategory = import('@ruleoak/protocol').CapabilityDriftCategory;
export const CAPABILITY_HISTORY_LIMITS: Readonly<{maxBytes:number;maxLineBytes:number;maxObservations:number}>;
export function classifyCapabilityDrift(previousTool:CapabilityTool|null,currentTool:CapabilityTool|null,context?:{previousTransport?:string|null;currentTransport?:string|null}):CapabilityDriftCategory[];
export function capabilityObservationDigestPayload(observation:CapabilityObservation):Omit<CapabilityObservation,'observation_id'>;
export function verifyCapabilityObservationDigest(observation:CapabilityObservation):boolean;
export function isPublicationSafeCapabilityObservation(observation:CapabilityObservation):boolean;
export function buildCapabilityObservation(input:{manifest:CapabilityManifest;tool:CapabilityTool;lifecycleState:CapabilityLifecycleState;driftCategories?:CapabilityDriftCategory[];previousObservationId?:string|null;observedAt?:string;identityOverride?:{integration_id?:string;integration_name?:string;transport?:string}}):CapabilityObservation;
export function observeCapabilityManifest(history:CapabilityObservation[],manifest:CapabilityManifest,options?:{observedAt?:string;previousManifest?:CapabilityManifest|null}):CapabilityObservation[];
export function queryCapabilityHistory(history:CapabilityObservation[],query?:{integrationId?:string;capabilityId?:string;lifecycleState?:CapabilityLifecycleState;driftCategory?:CapabilityDriftCategory;since?:string;until?:string}):CapabilityObservation[];
export class FileCapabilityHistoryStore { constructor(filePath:string,limits?:Partial<{maxBytes:number;maxLineBytes:number;maxObservations:number}>); filePath:string; load():CapabilityObservation[]; append(observations?:CapabilityObservation[]):{appended:number;duplicates:number;total:number}; observe(manifest:CapabilityManifest,options?:{observedAt?:string;previousManifest?:CapabilityManifest|null}):{appended:number;duplicates:number;total:number;observations:CapabilityObservation[]}; query(query?:Record<string,unknown>):CapabilityObservation[]; }
export function buildCapabilityManifest(input?:Record<string,unknown>,options?:Record<string,unknown>):CapabilityManifest;
export function diffCapabilityManifests(previous:CapabilityManifest,current:CapabilityManifest):Record<string,unknown>;
export function recommendCapabilityPolicy(manifest:CapabilityManifest):Array<Record<string,unknown>>;
export const CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES:readonly string[];
export function validateCrashScenario(scenario?:Record<string,unknown>):{valid:boolean;errors:string[]};
export class SyntheticEffectTarget { constructor(options?:{idempotent?:boolean}); effects:Array<Record<string,unknown>>; apply(request?:Record<string,unknown>):Record<string,unknown>; applyPartial(request?:Record<string,unknown>):Record<string,unknown>; }
export function runCrashScenario(scenario:Record<string,unknown>,options?:Record<string,unknown>):Promise<Record<string,unknown>>;
export const RELIABILITY_SCORECARD_VERSION:'1.0';
export const RELIABILITY_SCORECARD_DIMENSIONS:readonly ['duplicate_effect_resistance','revocation_compliance','ambiguity_handling','retry_boundedness','evidence_completeness','recovery_correctness'];
export const RELIABILITY_CI_EXIT_CODES:Readonly<{PASS:0;FAIL:2}>;
export interface ReliabilityScorecardDimension { status:'PASS'|'FAIL'|'NOT_APPLICABLE'; applicable_checks:number; passed_checks:number; failed_checks:number; checks:Array<Record<string,unknown>>; }
export interface ReliabilityScorecard { scorecard_version:'1.0'; ruleoak_version:string; report_kind:'ruleoak.crashlab.reliability_scorecard'; status:'PASS'|'FAIL'; summary:{scenarios:{total:number;pass:number;fail:number};dimensions:{pass:number;fail:number;not_applicable:number}}; dimensions:Record<(typeof RELIABILITY_SCORECARD_DIMENSIONS)[number],ReliabilityScorecardDimension>; failing_invariants:Array<{scenario_id:string;invariant:string;dimension:string}>; scenarios:Array<Record<string,unknown>>; }
export function buildReliabilityScorecard(results:Array<Record<string,unknown>>):ReliabilityScorecard;
export function reliabilityScorecardExitCode(scorecard:ReliabilityScorecard):0|2;
export function serializeReliabilityScorecardJson(scorecard:ReliabilityScorecard):string;
export function renderReliabilityScorecardSummary(scorecard:ReliabilityScorecard):string;
export function serializeReliabilityScorecardJUnit(scorecard:ReliabilityScorecard):string;
export function buildReliabilityScorecardSarif(scorecard:ReliabilityScorecard):Record<string,unknown>;
export function serializeReliabilityScorecardSarif(scorecard:ReliabilityScorecard):string;
export function adaptGitAction(operation:string,repository:string,options?:Record<string,unknown>):NormalizedToolCall;
export function executeGitAction(call:NormalizedToolCall,options:{lease:ExecutionLease;leaseSecret:string;leaseStoreDir:string;policy?:Policy;effectSecret?:string;allowLocalPush?:boolean;allowNetworkPush?:boolean;timeoutMs?:number;revocationRegistry?:RevocationRegistry;ledger?:RuleOakAuthorityLedger;[key:string]:unknown}):Promise<{ok:boolean;executed:boolean;call:NormalizedToolCall;consumption:Record<string,unknown>;effectReceipt:EffectReceipt|null;errors:string[]}>;
export const gitAdapter:{descriptor:AdapterContractDescriptor;normalize:(input:Record<string,unknown>,options?:Record<string,unknown>)=>NormalizedToolCall;execute:typeof executeGitAction};

export interface AdapterObservationCapability { quality:ObservationQuality; boundary:string; statuses:Array<EffectReceipt['status']>; }
export interface AdapterContractDescriptor { contract_version:'1.0'|'1.1'; adapter_id:string; mode:'normalize'|'execute'; observation_qualities?:Array<LegacyObservationQuality|ObservationQuality>; observation_capabilities?:AdapterObservationCapability[]; }
export const ADAPTER_CONTRACT_VERSION:'1.1';
export const ADAPTER_CONTRACT_VERSIONS:readonly ['1.0','1.1'];
export const BUILTIN_ADAPTER_DESCRIPTORS:Readonly<Record<string,AdapterContractDescriptor>>;
export function validateAdapterDescriptor(descriptor:unknown):{valid:boolean;errors:string[]};
export function adapterDescriptor(adapterId:string):AdapterContractDescriptor|null;
export function observationCapability(descriptor:AdapterContractDescriptor,quality:ObservationQuality):AdapterObservationCapability|null;
export function annotateAdapterContract(call:NormalizedToolCall,adapterId:string):NormalizedToolCall;
export function runAdapterConformance(adapter:{descriptor:AdapterContractDescriptor;normalize:(input:unknown,options?:Record<string,unknown>)=>NormalizedToolCall|Promise<NormalizedToolCall>;execute?:Function},fixtures?:Array<{input:unknown;options?:Record<string,unknown>}>):Promise<{ok:boolean;errors:string[];results:Array<Record<string,unknown>>}>;
export function validateEffectReceiptAgainstAdapter(receipt:EffectReceipt,descriptor:AdapterContractDescriptor):{ok:boolean;errors:string[]};
export interface PublicCapabilityIndexEntry { manifest:CapabilityManifest; observed_at?:string|null; slug?:string; }
export interface PublicCapabilityIndex { index_version:'1.0'; generated_at:string|null; base_url:string|null; integrations:Array<Record<string,unknown>>; drift_events:Array<Record<string,unknown>>; }
export function capabilityIndexSlug(value?:string):string;
export function sanitizePublicCapabilityManifest(manifest:CapabilityManifest):CapabilityManifest;
export function buildPublicCapabilityIndex(entries?:PublicCapabilityIndexEntry[],options?:{generatedAt?:string|null;baseUrl?:string|null}):PublicCapabilityIndex;
export const RULEOAK_EXTENSION_SPI_VERSION:'1.0';
export interface RuleOakExtension<T=Record<string,unknown>> { descriptor:import('@ruleoak/protocol').RuleOakExtensionDescriptor; implementation:T; }
export function validateRuleOakExtension(extension:unknown):{valid:boolean;errors:string[]};
export class RuleOakExtensionRegistry { register(extension:RuleOakExtension):import('@ruleoak/protocol').RuleOakExtensionDescriptor; list(kind?:import('@ruleoak/protocol').RuleOakExtensionKind|null):import('@ruleoak/protocol').RuleOakExtensionDescriptor[]; get(id:string):RuleOakExtension|null; organizationPolicies(context?:Record<string,unknown>):Promise<Array<Record<string,unknown>>>; requestApproval(request:Record<string,unknown>,context?:Record<string,unknown>):Promise<Record<string,unknown>>; emitEvent(event:Record<string,unknown>,context?:Record<string,unknown>):Promise<Array<Record<string,unknown>>>; enrichInspector(manifest:CapabilityManifest,context?:Record<string,unknown>):Promise<Array<Record<string,unknown>>>; crashlabScenarios(context?:Record<string,unknown>):Promise<Array<Record<string,unknown>>>; }
export class MemoryEventSink { constructor(id?:string); events:Array<Record<string,unknown>>; descriptor:import('@ruleoak/protocol').RuleOakExtensionDescriptor; emit(event:Record<string,unknown>):Record<string,unknown>; asExtension():RuleOakExtension; }
export class StaticOrganizationPolicyProvider { constructor(policy:Policy,id?:string); descriptor:import('@ruleoak/protocol').RuleOakExtensionDescriptor; getPolicy():Policy; asExtension():RuleOakExtension; }

export interface McpRegistryServerRecord { name:string; title:string|null; version:string; description:string|null; status:string; is_latest:boolean; published_at:string|null; updated_at:string|null; remotes:Array<{type:string;url:string}>; packages:Array<{registry_type:string;identifier:string;version:string}>; repository:{url:string|null;source:string|null}|null; registry_record_digest:string; }
export interface McpRegistrySnapshot { snapshot_version:'1.0'; source:'official-mcp-registry'; registry_base_url:string; observed_at:string; evidence_class:'public-registry-metadata-not-capability-evidence'; count:number; servers:McpRegistryServerRecord[]; snapshot_digest:string; pages_fetched?:number; truncated?:boolean; next_cursor?:string|null; }
export function normalizeOfficialRegistryEntry(entry: Record<string,unknown>): McpRegistryServerRecord;
export function buildMcpRegistrySnapshot(entries: Array<Record<string,unknown>>, options?: {latestOnly?:boolean;registryBaseUrl?:string;observedAt?:string}): McpRegistrySnapshot;
export function buildMcpRegistryInspectionQueue(snapshot: McpRegistrySnapshot, options?: {createdAt?:string}): {queue_version:'1.0';source_snapshot_digest:string|null;created_at:string;count:number;targets:Array<Record<string,unknown>>};
export function diffMcpRegistrySnapshots(previous:McpRegistrySnapshot,current:McpRegistrySnapshot): Record<string,unknown>;
export function capabilityEvidenceDigestPayload(evidence?:Record<string,unknown>):Record<string,unknown>;
export function verifyCapabilityEvidenceDigest(evidence?:Record<string,unknown>):boolean;
export function verifyCapabilityIdentityCapabilityDigest(identity?:Record<string,unknown>):boolean;
export function validateCapabilityIntelligenceIntegrity(manifest:unknown):{ok:boolean;valid:boolean;errors:string[];isValid:boolean;errorMessage:string};

export function fetchOfficialMcpRegistrySnapshot(options?: {registryBaseUrl?:string;allowCustomRegistryBase?:boolean;allowInsecureCustomRegistry?:boolean;limit?:number;maxPages?:number;latestOnly?:boolean;observedAt?:string;signal?:AbortSignal;fetchImpl?:typeof fetch}): Promise<McpRegistrySnapshot>;


export type AuthorityGraph = import('@ruleoak/protocol').AuthorityGraph;
export type AuthorityGraphNode = import('@ruleoak/protocol').AuthorityGraphNode;
export type AuthorityGraphEdge = import('@ruleoak/protocol').AuthorityGraphEdge;
export function buildAuthorityGraph(input?:{grants?:AuthorityGrant[];envelopes?:AuthorityEnvelope[];decisions?:import('@ruleoak/protocol').DecisionReceipt[];approvals?:Array<Record<string,unknown>>;leases?:ExecutionLease[];effects?:EffectReceipt[]},options?:{generatedAt?:string|null}):AuthorityGraph;
export function queryAuthorityGraph(graph:AuthorityGraph,query?:{kind?:import('@ruleoak/protocol').AuthorityGraphNodeKind;refId?:string;nodeId?:string;principalId?:string}):{graph_id:string;nodes:AuthorityGraphNode[];edges:AuthorityGraphEdge[];unresolved_references:import('@ruleoak/protocol').AuthorityGraphUnresolvedReference[]};
export function explainAuthorityGraph(graph:AuthorityGraph,targetNodeId:string,options?:{maxDepth?:number}):{graph_id:string;target:AuthorityGraphNode;nodes:AuthorityGraphNode[];edges:AuthorityGraphEdge[];unresolved_references:import('@ruleoak/protocol').AuthorityGraphUnresolvedReference[];complete:boolean;summary:string;chain:string[]};
export function authorityGraphDigestPayload(graph:AuthorityGraph):Omit<AuthorityGraph,'graph_id'|'generated_at'> & {graph_version:'1.0'};
export function verifyAuthorityGraphDigest(graph:AuthorityGraph):boolean;


export type EvidenceGraph=import('@ruleoak/protocol').EvidenceGraph;
export type EvidenceGraphNode=import('@ruleoak/protocol').EvidenceGraphNode;
export type EvidenceGraphEdge=import('@ruleoak/protocol').EvidenceGraphEdge;
export function buildEvidenceGraph(input:{authorityGraph:AuthorityGraph;events?:Array<Record<string,unknown>>},options?:{generatedAt?:string|null}):EvidenceGraph;
export function evidenceGraphDigestPayload(graph:EvidenceGraph):Omit<EvidenceGraph,'graph_id'|'generated_at'> & {evidence_graph_version:'1.0'};
export function verifyEvidenceGraphDigest(graph:EvidenceGraph):boolean;
export function queryEvidenceTimeline(graph:EvidenceGraph,query?:{kind?:import('@ruleoak/protocol').EvidenceGraphNodeKind;refId?:string;from?:string;to?:string;limit?:number}):{graph_id:string;items:EvidenceGraphNode[];truncated:boolean};
export function traceEvidenceGraph(graph:EvidenceGraph,targetNodeId:string,options?:{maxDepth?:number}):{graph_id:string;target:EvidenceGraphNode;nodes:EvidenceGraphNode[];edges:EvidenceGraphEdge[];unresolved_references:import('@ruleoak/protocol').EvidenceGraphUnresolvedReference[];complete:boolean;summary:string};


export interface EvidenceSinkDescriptor { sink_spi_version:'1.0'; sink_id:string; network:'none'|'optional'|'required'; accepted_profiles:Array<'minimal'|'operational'|'forensic_local'>; description?:string; }
export const EVIDENCE_SINK_SPI_VERSION:'1.0';
export const EVIDENCE_SINK_NETWORK_MODES:readonly ['none','optional','required'];
export function validateEvidenceSinkDescriptor(descriptor:unknown):{valid:boolean;errors:string[]};
export class EvidenceSinkRegistry { register(sink:{descriptor:EvidenceSinkDescriptor;implementation:{write(input:{bytes:Buffer;manifest:import('@ruleoak/protocol').EvidenceBundleManifest},context?:Record<string,unknown>):unknown}}):EvidenceSinkDescriptor; list():EvidenceSinkDescriptor[]; deliver(bundle:{bytes:Buffer;manifest:import('@ruleoak/protocol').EvidenceBundleManifest},context?:Record<string,unknown>):Promise<Array<{sink_id:string;ok:boolean;response?:unknown;error?:string}>>; }
export class LocalFileEvidenceSink { constructor(directory:string,id?:string); descriptor:EvidenceSinkDescriptor; write(input:{bytes:Buffer;manifest:import('@ruleoak/protocol').EvidenceBundleManifest}):{path:string;bundle_id:string;bytes:number}; asSink():{descriptor:EvidenceSinkDescriptor;implementation:LocalFileEvidenceSink}; }

export const EFFECT_VERIFICATION_STATES:Readonly<{CONFIRMED_SUCCESS:'confirmed_success';CONFIRMED_FAILURE:'confirmed_failure';PARTIAL_OR_AMBIGUOUS:'partial_or_ambiguous';UNKNOWN:'unknown';INVALID:'invalid'}>;
export const RETRY_DISPOSITIONS:Readonly<{DO_NOT_RETRY:'do_not_retry';SAFE_TO_RETRY_WITH_NEW_AUTHORITY:'safe_to_retry_with_new_authority';VERIFY_BEFORE_RETRY:'verify_before_retry';MANUAL_REVIEW:'manual_review'}>;
export interface EffectVerificationResult {state:'confirmed_success'|'confirmed_failure'|'partial_or_ambiguous'|'unknown'|'invalid';reason:string;evidence:Record<string,unknown>}
export interface EffectVerificationRecord extends EffectVerificationResult {verification_version:'1.0';verification_id:string;effect_id:string|null;lease_id:string|null;decision_id:string|null;action_digest:string|null;verified_at:string;verification_digest:string}
export interface FilesystemEffectContract {adapter:'filesystem';operation:string;requested:Record<string,unknown>;verifier_spec:Record<string,unknown>;retry_safe:boolean;[key:string]:unknown}
export function captureFilesystemState(path:string,options?:Record<string,unknown>):Record<string,unknown>;
export function inferFilesystemEffectContract(input?:Record<string,unknown>,options?:Record<string,unknown>):FilesystemEffectContract|null;
export function inferMcpEffectContract(item?:Record<string,unknown>,options?:Record<string,unknown>):FilesystemEffectContract|null;
export function verifyFilesystemPostcondition(requested?:Record<string,unknown>,options?:Record<string,unknown>):EffectVerificationResult;
export function verifyGitPostcondition(requested?:Record<string,unknown>,options?:Record<string,unknown>):EffectVerificationResult;
export function verifyProcessPostcondition(requested?:Record<string,unknown>,options?:Record<string,unknown>):EffectVerificationResult;
export function verifyHttpPostcondition(requested?:Record<string,unknown>,options?:Record<string,unknown>):Promise<EffectVerificationResult>;
export function buildEffectVerificationRecord(receipt:EffectReceipt,verification:EffectVerificationResult,options:{lease:ExecutionLease;actionDigest?:string;verificationId?:string;verifiedAt?:string;nonce?:string}):EffectVerificationRecord;
export function decideEffectRetry(receipt:EffectReceipt,verificationRecord?:EffectVerificationRecord|null,options?:{lease?:ExecutionLease;completeFailureMeansNoEffect?:boolean}):{disposition:'do_not_retry'|'safe_to_retry_with_new_authority'|'verify_before_retry'|'manual_review';reason:string;requires_new_authority:boolean};

export const AGENT_RELEASE_STATES:Readonly<{PASS:'PASS';PASS_WITH_CONDITIONS:'PASS_WITH_CONDITIONS';BLOCK:'BLOCK';INSUFFICIENT_EVIDENCE:'INSUFFICIENT_EVIDENCE';INCOMPARABLE:'INCOMPARABLE'}>;
export const DEFAULT_AGENT_RELEASE_POLICY:Readonly<Record<string,number|boolean>>;
export interface AgentReleaseDecision {state:'PASS'|'PASS_WITH_CONDITIONS'|'BLOCK'|'INSUFFICIENT_EVIDENCE'|'INCOMPARABLE';blocking_reasons:string[];warnings:string[];evidence_gaps:string[];metrics:Record<string,unknown>;policy_digest:string}
export function evaluateAgentReleaseGate(baseline:Record<string,unknown>,candidate:Record<string,unknown>,policy?:Record<string,unknown>):AgentReleaseDecision;
export function buildAgentReleasePassport(baseline:Record<string,unknown>,candidate:Record<string,unknown>,decision:AgentReleaseDecision,options?:{releaseId?:string;generatedAt?:string}):Record<string,unknown>;
