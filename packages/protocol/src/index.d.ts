// SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
// SPDX-License-Identifier: Apache-2.0

export type DecisionAction = 'allow' | 'deny' | 'block' | 'needs_approval' | 'dry_run_only';
export type CanonicalDecisionAction = 'allow' | 'deny' | 'needs_approval' | 'dry_run_only';
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type ActorType = 'agent' | 'user' | 'script' | 'service';
export type ToolCategory = 'file' | 'filesystem' | 'shell' | 'email' | 'web' | 'memory' | 'payment' | 'calendar' | 'custom';
export type ToolOperation = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'search' | 'create' | 'update' | 'run';
export type SensitivityLevel = 'public' | 'internal' | 'private' | 'secret' | 'unknown';
export type DataFlow = 'local' | 'external' | 'unknown';
export type SideEffect = 'read_only' | 'mutating' | 'destructive' | 'unknown';
export type AuthorityPrincipalType = 'user' | 'agent' | 'script' | 'service' | 'organization';

export interface NormalizedToolCall {
  call_id: string;
  timestamp: string;
  actor: { type: ActorType; name: string; session_id: string; id?: string; issuer?: string };
  tool: { name: string; category: ToolCategory; operation: ToolOperation };
  target: { resource: string; scope: string; sensitivity: SensitivityLevel };
  arguments: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface ActionEnvelope {
  type?: string;
  action?: string;
  target?: string;
  arguments?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExactActionRule {
  id?: string;
  effect: 'allow' | 'deny' | 'block' | 'needs_approval';
  decision_key: string;
  tool?: string;
  target?: string;
  allowCritical?: boolean;
  disabled?: boolean;
  status?: 'enabled' | 'disabled';
  source_suggestion_id?: string;
  source_approval_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface StructuredPolicyRule {
  id: string;
  effect: DecisionAction;
  description?: string;
  priority?: number;
  actions?: string[];
  resources?: string[];
  riskAtLeast?: RiskLevel;
  riskAtMost?: RiskLevel;
  allowCritical?: boolean;
  disabled?: boolean;
  status?: 'enabled' | 'disabled';
  conditions?: {
    categories?: ToolCategory[];
    operations?: ToolOperation[];
    sensitivities?: SensitivityLevel[];
    dataFlows?: DataFlow[];
    sideEffects?: SideEffect[];
    actorTypes?: ActorType[];
    scopes?: string[];
    actorNames?: string[];
    sessionIds?: string[];
    agentIds?: string[];
    principalIds?: string[];
    grantIds?: string[];
    intentIds?: string[];
    taskIds?: string[];
  };
  [key: string]: unknown;
}

export interface Policy {
  policyVersion?: 1 | 2;
  defaultAction?: DecisionAction;
  allowedActions?: string[];
  approvalRequired?: string[];
  blockedActions?: string[];
  exactActionRules?: ExactActionRule[];
  rules?: StructuredPolicyRule[];
  [key: string]: unknown;
}



export type CapabilityEvidenceClass = 'registry_metadata'|'declared_manifest'|'runtime_discovery'|'local_package_evidence'|'inferred_classification'|'operator_annotation'|'historical_observation';
export type CapabilityIdentityBasis = 'explicit'|'package-identifier'|'source-anchor'|'name-transport';
export interface CapabilityIdentity { identity_version:'1.0'; integration_id:string; capability_id:string; integration_name:string; action_name:string; transport:string; identity_basis:CapabilityIdentityBasis; }
export interface CapabilityEvidence { evidence_version:'1.0'; evidence_id:string; evidence_classes:CapabilityEvidenceClass[]; observed_at:string|null; source:{source_kind:string;source_digest:string|null;declared_version:string|null;protocol_version:string|null}; mutability:string; classification_basis:Record<string,unknown>; }
export const CAPABILITY_IDENTITY_VERSIONS: readonly ['1.0'];
export const CAPABILITY_EVIDENCE_VERSIONS: readonly ['1.0'];
export const CAPABILITY_EVIDENCE_CLASSES: readonly CapabilityEvidenceClass[];
export const CAPABILITY_IDENTITY_BASES: readonly CapabilityIdentityBasis[];
export type CapabilityLifecycleState = 'first_seen'|'present'|'removed'|'reintroduced';
export type CapabilityDriftCategory = 'metadata_change'|'schema_change'|'capability_expansion'|'capability_contraction'|'consequence_escalation'|'consequence_reduction'|'provenance_change'|'transport_change'|'classification_basis_change';
export interface CapabilityObservation { observation_version:'1.0'; observation_id:string; integration_id:string; capability_id:string; integration_name:string; action_name:string; observed_at:string; lifecycle_state:CapabilityLifecycleState; drift_categories:CapabilityDriftCategory[]; previous_observation_id:string|null; snapshot:{state:'read_only'|'state_changing'|'unknown'|'removed'; consequence:'read_only'|'high_consequence'|'destructive'|'unknown'|'removed'; secret_or_identity_related:boolean; schema_digest:string|null; classification_basis:Record<string,unknown>; transport:string; evidence:CapabilityEvidence}; }
export const CAPABILITY_OBSERVATION_VERSIONS: readonly ['1.0'];
export const CAPABILITY_LIFECYCLE_STATES: readonly CapabilityLifecycleState[];
export const CAPABILITY_DRIFT_CATEGORIES: readonly CapabilityDriftCategory[];
export function validateCapabilityObservation(observation:unknown):{valid:boolean;errors:string[];isValid:boolean;errorMessage:string};
export function validateCapabilityIdentity(identity:unknown):{valid:boolean;errors:string[];isValid:boolean;errorMessage:string};
export function validateCapabilityEvidence(evidence:unknown):{valid:boolean;errors:string[];isValid:boolean;errorMessage:string};


export type AuthorityGraphNodeKind = 'principal'|'grant'|'envelope'|'decision'|'approval'|'lease'|'effect';
export interface AuthorityGraphNode { node_id:string; kind:AuthorityGraphNodeKind; ref_id:string; data:Record<string,unknown>; }
export interface AuthorityGraphEdge { edge_id:string; from:string; to:string; relation:string; }
export interface AuthorityGraphUnresolvedReference { source_node_id:string; relation:string; target_kind:AuthorityGraphNodeKind; target_ref_id:string; }
export interface AuthorityGraph { graph_version:'1.0'; graph_id:string; generated_at:string|null; nodes:AuthorityGraphNode[]; edges:AuthorityGraphEdge[]; unresolved_references:AuthorityGraphUnresolvedReference[]; }
export const AUTHORITY_GRAPH_VERSIONS: readonly ['1.0'];
export const AUTHORITY_GRAPH_NODE_KINDS: readonly AuthorityGraphNodeKind[];
export function validateAuthorityGraph(graph:unknown):ValidationResult;

export interface AuthorityPrincipal {
  type: AuthorityPrincipalType;
  id: string;
  name?: string;
  issuer?: string;
}

export interface AuthorityCapability {
  id?: string;
  actions: string[];
  resources: string[];
}

export interface AuthorityDelegationPolicy { allowed:boolean; max_depth:number; budget_mode:'inherit'|'partition'; }
export interface AuthorityGrant {
  grant_version: '1.0'|'1.1';
  grant_id: string;
  issuer: string;
  subject: AuthorityPrincipal;
  principal_chain: AuthorityPrincipal[];
  capabilities: AuthorityCapability[];
  issued_at: string;
  not_before: string;
  expires_at: string;
  parent_grant_id?: string | null;
  delegation_depth: number;
  ancestor_grant_ids?: string[];
  budget?: Record<string,number>;
  obligations?: Array<Record<string,unknown>>;
  delegation?: AuthorityDelegationPolicy;
  task_id?: string;
  intent_id?: string;
  session_id?: string;
  signature?: string;
}

export const AUTHORITY_GRANT_VERSIONS: readonly ['1.0','1.1'];
export const DELEGATION_BUDGET_MODES: readonly ['inherit','partition'];
export const MAX_AUTHORITY_DELEGATION_DEPTH: 32;
export const AUTHORITY_PRINCIPAL_TYPES: readonly AuthorityPrincipalType[];
export function validateAuthorityGrant(grant: unknown): { valid: boolean; errors: string[]; isValid: boolean; errorMessage: string };

export interface ApprovalRequest { approval_request_version:'1.0'; approval_id:string; request_decision_id:string; request_digest:string; issuer:string; audience:string; provider_id:string; requested_at:string; not_before:string; expires_at:string; one_time:true; request_nonce:string; action_digest:string; policy_digest:string; principal_id:string; risk?:RiskLevel; call_id?:string|null; session_id?:string|null; summary?:string; canonical_action?:string|null; canonical_resource?:string|null; decision_key?:string; decision_channel?:string; reason?:string; normalized_call?:Record<string,unknown>; action?:Record<string,unknown>; classification?:Record<string,unknown>; }
export interface ApprovalResult { approval_result_version:'1.0'; approval_result_id:string; approval_id:string; request_decision_id:string; request_digest:string; result_digest:string; action_digest:string; policy_digest:string; principal_id:string; provider_id:string; provider_name?:string; approver:AuthorityPrincipal; decision:'allow'|'deny'; decision_scope?:string; reason?:string; decided_at:string; not_before:string; expires_at:string; one_time:true; result_nonce:string; signature?:string; }
export const APPROVAL_REQUEST_VERSIONS: readonly ['1.0'];
export const APPROVAL_RESULT_VERSIONS: readonly ['1.0'];
export const APPROVAL_RESULT_DECISIONS: readonly ['allow','deny'];
export function validateApprovalRequest(request:unknown):ValidationResult;
export function validateApprovalResult(result:unknown):ValidationResult;

export interface DecisionReceipt {
  receipt_version: '1.0' | '1.1' | '1.2';
  decision_id: string;
  nonce?: string;
  issuer?: string;
  audience?: string;
  one_time?: true;
  not_before?: string;
  evaluated_at: string;
  expires_at: string;
  action_digest: string;
  policy_digest: string;
  decision: CanonicalDecisionAction;
  risk: RiskLevel;
  source?: string;
  matched_rule?: string | null;
  call_id?: string | null;
  session_id?: string | null;
  signature?: string;
  authority_grant_id?: string | null;
  principal_id?: string | null;
  canonical_action?: string | null;
  canonical_resource?: string | null;
  intent_id?: string | null;
  task_id?: string | null;
  approval_id?: string | null;
  approval_result_id?: string | null;
  approval_request_decision_id?: string | null;
  approval_provider_id?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  errorMessage: string;
}

export const DECISIONS: readonly DecisionAction[];
export const CANONICAL_DECISIONS: readonly CanonicalDecisionAction[];
export const RISK_LEVELS: readonly RiskLevel[];
export const ACTOR_TYPES: readonly ActorType[];
export const TOOL_CATEGORIES: readonly ToolCategory[];
export const TOOL_OPERATIONS: readonly ToolOperation[];
export const SENSITIVITY_LEVELS: readonly SensitivityLevel[];
export const DATA_FLOWS: readonly DataFlow[];
export const SIDE_EFFECTS: readonly SideEffect[];
export const POLICY_EFFECTS: readonly DecisionAction[];

export function isObject(value: unknown): value is Record<string, unknown>;
export function normalizeDecisionAction(value: DecisionAction): CanonicalDecisionAction;
export function validateActionEnvelope(action: unknown): ValidationResult;
export function validatePolicy(policy: unknown): ValidationResult;
export const validatePolicyStructure: typeof validatePolicy;
export function validateNormalizedToolCall(call: unknown): ValidationResult;
export function validateDecisionReceipt(receipt: unknown): ValidationResult;
export function validateEvidenceEvent(event: unknown): ValidationResult;
export function loadJsonLines(text: string): unknown[];

export interface AuthorizationApiResponse {
  api_version: '1.0';
  decision: { action: CanonicalDecisionAction; reason: string; [key: string]: unknown };
  classification?: Record<string, unknown>;
  normalized_call?: NormalizedToolCall;
  approval?: { approval_id: string; status: string; [key: string]: unknown } | null;
  evidence?: { event_id?: string; index?: number; [key: string]: unknown };
}
export interface AuthorizationApiError { error: { code: string; message: string; [key: string]: unknown } }
export function validateAuthorizationApiResponse(value: unknown): ValidationResult;
export function validateAuthorizationApiError(value: unknown): ValidationResult;


export const AUTHORITY_ENVELOPE_VERSIONS: readonly ['1.0'];
export interface AuthorityEnvelope {
  envelope_version: '1.0'; envelope_id: string; grant_id: string; principal_chain: AuthorityPrincipal[]; capabilities: AuthorityCapability[];
  issued_at: string; not_before: string; expires_at: string; constraints: Record<string, unknown>; obligations: Array<Record<string, unknown>>;
  intent_id?: string; task_id?: string; session_id?: string; policy_digest?: string; revocation_ref?: string; attestation?: Record<string, unknown>; signature?: string;
}
export const EXECUTION_LEASE_VERSIONS: readonly ['1.0','1.1','1.2'];
export interface ExecutionLease {
  lease_version: '1.0'|'1.1'|'1.2'; lease_id: string; decision_id: string; principal_id: string; authority_envelope_id: string | null; authority_grant_id: string | null;
  action_digest: string; policy_digest: string; canonical_action: string; canonical_resource: string; issued_at: string; not_before: string; expires_at: string;
  max_uses: 1; approval_id?:string; approval_result_id?:string; authority_ancestor_grant_ids?: string[]; authority_principal_ids?: string[]; budget?: Record<string, number>; obligations?: Array<Record<string, unknown>>; nonce: string; signature?: string;
}
export type LegacyObservationQuality='complete-for-adapter'|'partial'|'inferred'|'unavailable';
export type ObservationQuality='requested_only'|'process_return_observed'|'local_state_observed'|'remote_response_observed'|'complete_for_adapter'|'partial'|'ambiguous';
export interface EffectReceipt {
  effect_version: '1.0'|'1.1'; effect_id: string; lease_id: string; decision_id: string; adapter: string; adapter_contract_version?:'1.1'; started_at: string; completed_at: string;
  status: 'success'|'failure'|'partial'|'unknown'; observation_quality: LegacyObservationQuality|ObservationQuality; observation_boundary?:string; requested?: Record<string, unknown>; observed: Record<string, unknown>; error?: Record<string, unknown>|null; signature?: string;
}
export const EFFECT_RECEIPT_VERSIONS:readonly ['1.0','1.1'];
export const LEGACY_OBSERVATION_QUALITIES:readonly LegacyObservationQuality[];
export const OBSERVATION_QUALITIES:readonly ObservationQuality[];
export function validateAuthorityEnvelope(value: unknown): ValidationResult;
export function validateExecutionLease(value: unknown): ValidationResult;
export function validateEffectReceipt(value: unknown): ValidationResult;
export type RuleOakExtensionKind='organization_policy'|'approval'|'event_sink'|'inspector_intelligence'|'crashlab_scenario';
export type RuleOakExtensionDataClass='normalized_actions'|'authority_metadata'|'effect_metadata'|'capability_metadata'|'scenario_metadata';
export interface RuleOakExtensionDescriptor { spi_version:'1.0'; extension_id:string; kind:RuleOakExtensionKind; data_access:RuleOakExtensionDataClass[]; network:'none'|'optional'|'required'; description?:string; }
export const EXTENSION_SPI_VERSIONS:readonly string[];
export const EXTENSION_KINDS:readonly RuleOakExtensionKind[];
export const EXTENSION_DATA_CLASSES:readonly RuleOakExtensionDataClass[];
export function validateExtensionDescriptor(descriptor:unknown):{valid:boolean;errors:string[];isValid:boolean;errorMessage:string};


export type EvidenceGraphNodeKind='principal'|'grant'|'envelope'|'decision'|'approval'|'lease'|'adapter'|'effect'|'recorder_event';
export interface EvidenceGraphNode { node_id:string;kind:EvidenceGraphNodeKind;ref_id:string;occurred_at:string|null;data:Record<string,unknown>; }
export interface EvidenceGraphEdge { edge_id:string;from:string;to:string;relation:string; }
export interface EvidenceGraphUnresolvedReference { source_node_id:string;relation:string;target_kind:EvidenceGraphNodeKind;target_ref_id:string; }
export interface EvidenceGraph {
  evidence_graph_version:'1.0';
  graph_id:string;
  generated_at:string|null;
  source:{authority_graph_id:string;evidence_event_count:number;evidence_chain_final_hash:string;evidence_verified:true};
  nodes:EvidenceGraphNode[];
  edges:EvidenceGraphEdge[];
  unresolved_references:EvidenceGraphUnresolvedReference[];
}
export const EVIDENCE_GRAPH_VERSIONS:readonly ['1.0'];
export const EVIDENCE_GRAPH_NODE_KINDS:readonly EvidenceGraphNodeKind[];
export function validateEvidenceGraph(graph:unknown):ValidationResult;


export type EvidencePrivacyProfile='minimal'|'operational'|'forensic_local';
export type EvidenceBundleFileRole='minimal_timeline'|'raw_evidence'|'graph_summary'|'authority_graph'|'evidence_graph'|'policy'|'workspace'|'approval_state'|'session_state'|'authority_state'|'supporting_state'|'report'|'other';
export interface EvidenceBundleManifest { bundle_version:'3.0'; bundle_id:string; created_at:string; privacy_profile:EvidencePrivacyProfile; source:{evidence_sha256:string;event_count:number;final_hash:string;first_event_at:string|null;last_event_at:string|null;chain_verified_at_export:true;raw_evidence_included:boolean}; graphs:{authority_graph_id:string;evidence_graph_id:string}; adapters:Array<{adapter_id:string;adapter_contract_version:string|null}>; files:Array<{path:string;size:number;sha256:string;role:EvidenceBundleFileRole}>; verification:{source_chain:'reverify_from_bundle'|'verified_at_export_only';graphs:'reverify_from_bundle'|'verified_at_export_only';instructions:string[]}; privacy:{includes_raw_evidence:boolean;includes_policy:boolean;includes_workspace_state:boolean;includes_approval_state:boolean;includes_session_state:boolean}; signature?:{algorithm:'hmac-sha256';key_hint:string;value:string}; }
export const EVIDENCE_BUNDLE_VERSIONS:readonly ['3.0'];
export const EVIDENCE_PRIVACY_PROFILES:readonly EvidencePrivacyProfile[];
export const EVIDENCE_BUNDLE_FILE_ROLES:readonly EvidenceBundleFileRole[];
export function validateEvidenceBundleManifest(manifest:unknown):ValidationResult;

export type AdapterContractVersion='1.0'|'1.1';
export interface AdapterObservationCapability { quality:ObservationQuality; boundary:string; statuses:Array<'success'|'failure'|'partial'|'unknown'>; }
export interface AdapterDescriptorV10 { contract_version:'1.0'; adapter_id:string; mode:'normalize'|'execute'; observation_qualities:LegacyObservationQuality[]; }
export interface AdapterDescriptorV11 { contract_version:'1.1'; adapter_id:string; mode:'normalize'|'execute'; observation_capabilities:AdapterObservationCapability[]; }
export type AdapterDescriptor=AdapterDescriptorV10|AdapterDescriptorV11;
export const ADAPTER_CONTRACT_VERSIONS:readonly ['1.0','1.1'];
export function validateAdapterDescriptor(descriptor:unknown):ValidationResult;

export type RevocationSubjectType='principal'|'authority_grant'|'authority_envelope'|'execution_lease'|'session';
export interface RevocationRecord { revocation_version:'1.0'|'1.1'; revocation_id:string; sequence?:number; subject_type:RevocationSubjectType; subject_id:string; revoked_at:string; reason:string; cascade:boolean; parent_id?:string|null; record_digest?:string; }
export const REVOCATION_RECORD_VERSIONS:readonly ['1.0','1.1'];
export const REVOCATION_SUBJECT_TYPES:readonly RevocationSubjectType[];
export function validateRevocationRecord(record:unknown):ValidationResult;
export function canonicalProtocolJson(value:unknown):string;
export function revocationRecordDigestPayload(record:unknown):unknown;

export type CrashLabFailurePhase='before_authorization'|'after_authorization_before_effect'|'before_effect'|'after_effect_before_response'|'partial_effect'|'before_response';
export type CrashLabFailureClass='timeout'|'response_loss'|'token_expiry'|'revocation_race'|'concurrent_race'|'stale_capability'|'stale_policy'|'stale_approved_baseline'|'eventual_consistency'|'transport_failure'|'local_process_crash'|'duplicate_retry'|'synthetic_error';
export type CrashLabInvariant='duplicate_effect_resistance'|'retry_boundedness'|'authority_containment'|'revocation_compliance'|'ambiguity_preservation'|'evidence_completeness'|'recovery_correctness'|'one_use_authority'|'stale_state_rejection'|'eventual_consistency_handling';
export interface CrashLabScenarioV2 {
  scenario_version:'2.0'; scenario_id:string; name:string;
  target:{adapter_id:string;domain:string;action:string;resource?:string;idempotency:'none'|'supported'|'required';idempotency_key?:string|null};
  authority:{initial_state:'valid'|'denied'|'revoked';revoke_on_attempt?:number};
  fault:{phase:CrashLabFailurePhase;class:CrashLabFailureClass;on_attempt:number;repeat:'once'|'every_attempt'};
  retry:{max_attempts:number;strategy:'none'|'immediate';preserve_idempotency_key:boolean};
  expect:{effect_count:{min:number;max:number};authority_behavior:'allow'|'deny'|'deny_after_revoke'|'unchanged'|'one_winner';evidence:{quality:'none_observed'|ObservationQuality;status:'none'|'success'|'failure'|'partial'|'unknown';ambiguity:'none'|'preserve'};invariants:CrashLabInvariant[]};
}

export interface CrashLabScenarioV21 extends Omit<CrashLabScenarioV2,'scenario_version'> {
  scenario_version:'2.1';
  concurrency?:{actors:number;schedule:'deterministic_barrier';shared_authority:'one_use'|'revocable'};
  state?:{
    capability?:{expected:string;current:string};
    policy?:{expected:string;current:string};
    approved_baseline?:{expected:string;current:string};
    consistency?:{visible_on_attempt:number};
  };
}
export const CRASHLAB_SCENARIO_VERSIONS:readonly ['1.0','1.1','2.0','2.1'];
export const CRASHLAB_FAILURE_PHASES:readonly CrashLabFailurePhase[];
export const CRASHLAB_FAILURE_CLASSES:readonly CrashLabFailureClass[];
export const CRASHLAB_FAILURE_CLASS_PHASES:Readonly<Record<CrashLabFailureClass,readonly CrashLabFailurePhase[]>>;
export const CRASHLAB_RETRY_STRATEGIES:readonly ['none','immediate'];
export const CRASHLAB_IDEMPOTENCY_MODES:readonly ['none','supported','required'];
export const CRASHLAB_AUTHORITY_STATES:readonly ['valid','denied','revoked'];
export const CRASHLAB_AUTHORITY_EXPECTATIONS:readonly ['allow','deny','deny_after_revoke','unchanged','one_winner'];
export const CRASHLAB_AMBIGUITY_EXPECTATIONS:readonly ['none','preserve'];
export const CRASHLAB_EXPECTED_EVIDENCE_QUALITIES:readonly string[];
export const CRASHLAB_INVARIANTS:readonly CrashLabInvariant[];
export type ReliabilityScorecardDimensionId='duplicate_effect_resistance'|'revocation_compliance'|'ambiguity_handling'|'retry_boundedness'|'evidence_completeness'|'recovery_correctness';
export const RELIABILITY_SCORECARD_VERSIONS:readonly ['1.0'];
export const RELIABILITY_SCORECARD_DIMENSIONS:readonly ReliabilityScorecardDimensionId[];
export const RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS:Readonly<Record<CrashLabInvariant,ReliabilityScorecardDimensionId>>;
export function validateCrashLabScenario(scenario:unknown):ValidationResult;
