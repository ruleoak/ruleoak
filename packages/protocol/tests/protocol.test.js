/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateActionEnvelope, validatePolicy, validateNormalizedToolCall, validateDecisionReceipt, validateAuthorizationApiResponse, validateAuthorizationApiError, validateAuthorityGrant, validateAuthorityEnvelope, validateExecutionLease, validateEffectReceipt, validateCapabilityManifest, validateCapabilityIdentity, validateCapabilityEvidence, validateCapabilityObservation, validateAuthorityGraph, validateExtensionDescriptor, validateApprovalRequest, validateApprovalResult, validateEvidenceGraph, validateEvidenceBundleManifest, validateAdapterDescriptor, validateRevocationRecord, canonicalProtocolJson, revocationRecordDigestPayload
} from '../src/index.js';

const policy = JSON.parse(readFileSync(new URL('../fixtures/policies/default-policy.json', import.meta.url)));
assert.equal(validatePolicy(policy).valid, true);
assert.equal(validatePolicy({ ...policy, exactActionRules: [{ effect: 'allow', decision_key: 'sha256:test' }] }).valid, true);
assert.equal(validatePolicy({ ...policy, exactActionRules: [{ effect: 'needs_approval', decision_key: 'sha256:ask' }] }).valid, true);
assert.equal(validatePolicy({ ...policy, exactActionRules: [{ effect: 'explode', decision_key: 'sha256:test' }] }).valid, false);
assert.equal(validatePolicy({ policyVersion: 2, defaultAction: 'deny', rules: [{ id: 'allow-read', effect: 'allow', actions: ['filesystem.read'], resources: ['./public/**'], riskAtMost: 'low', conditions: { sideEffects: ['read_only'] } }] }).valid, true);
assert.equal(validatePolicy({ policyVersion: 2, rules: [{ id: 'bad', effect: 'allow', conditions: { dataFlows: ['teleport'] } }] }).valid, false);

assert.equal(validateActionEnvelope({ type: 'filesystem.read', target: './README.md' }).valid, true);
assert.equal(validateActionEnvelope({ target: './README.md' }).valid, false);
const normalized = JSON.parse(readFileSync(new URL('../fixtures/normalized-calls/read-public.json', import.meta.url)));
assert.equal(validateNormalizedToolCall(normalized).valid, true);
assert.equal(validateNormalizedToolCall({ ...normalized, tool: { ...normalized.tool, operation: 'explode' } }).valid, false);
assert.equal(validateDecisionReceipt({ receipt_version: '1.0', decision_id: 'dec_1', evaluated_at: '2026-01-01T00:00:00.000Z', expires_at: '2026-01-01T00:01:00.000Z', action_digest: 'sha256:a', policy_digest: 'sha256:b', decision: 'allow', risk: 'low' }).valid, true);
assert.equal(validateDecisionReceipt({ receipt_version: '1.0', decision: 'explode' }).valid, false);


const authorityGrant = {
  grant_version: '1.0',
  grant_id: 'grant_test',
  issuer: 'user:owner',
  subject: { type: 'agent', id: 'agent:test' },
  principal_chain: [{ type: 'user', id: 'user:owner' }, { type: 'agent', id: 'agent:test' }],
  capabilities: [{ id: 'read-project', actions: ['resource.read'], resources: ['ruleoak://file/project/**'] }],
  issued_at: '2026-08-14T00:00:00.000Z',
  not_before: '2026-08-14T00:00:00.000Z',
  expires_at: '2026-08-14T01:00:00.000Z',
  parent_grant_id: null,
  delegation_depth: 0
};
assert.equal(validateAuthorityGrant(authorityGrant).valid, true);
assert.equal(validateAuthorityGrant({ ...authorityGrant, capabilities: [] }).valid, false);
assert.doesNotThrow(() => JSON.parse(readFileSync(new URL('../schemas/authority-grant.schema.json', import.meta.url))));

assert.equal(validateAuthorizationApiResponse({ api_version: '1.0', decision: { action: 'allow', reason: 'test' }, approval: null }).valid, true);
assert.equal(validateAuthorizationApiResponse({ api_version: '1.0', decision: { action: 'explode', reason: 'test' } }).valid, false);
assert.equal(validateAuthorizationApiError({ error: { code: 'RULEOAK_TEST', message: 'test' } }).valid, true);
assert.doesNotThrow(() => JSON.parse(readFileSync(new URL('../schemas/authorization-api-response.schema.json', import.meta.url))));
assert.doesNotThrow(() => JSON.parse(readFileSync(new URL('../schemas/authorization-api-error.schema.json', import.meta.url))));



const capabilityIdentity={identity_version:'1.0',integration_id:'sha256:'+'a'.repeat(64),capability_id:'sha256:'+'b'.repeat(64),integration_name:'demo',action_name:'repo.read',transport:'stdio',identity_basis:'explicit'};
assert.equal(validateCapabilityIdentity(capabilityIdentity).valid,true);
assert.equal(validateCapabilityIdentity({...capabilityIdentity,capability_id:'sha256:short'}).valid,false);
const capabilityEvidence={evidence_version:'1.0',evidence_id:'sha256:'+'c'.repeat(64),evidence_classes:['runtime_discovery','inferred_classification'],observed_at:'2026-08-27T03:30:00.000Z',source:{source_kind:'remote-service',source_digest:'sha256:source',declared_version:null,protocol_version:'2026-07-28'},mutability:'remote-can-change-without-local-update',classification_basis:{state:'inferred:tool-name'}};
assert.equal(validateCapabilityEvidence(capabilityEvidence).valid,true);
assert.equal(validateCapabilityEvidence({...capabilityEvidence,evidence_classes:['runtime_discovery','runtime_discovery']}).valid,false);
assert.equal(validateCapabilityEvidence({...capabilityEvidence,observed_at:'not-a-time'}).valid,false);
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/capability-identity.schema.json',import.meta.url))));
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/capability-evidence.schema.json',import.meta.url))));
const capabilityObservation={observation_version:'1.0',observation_id:'sha256:'+'d'.repeat(64),integration_id:capabilityIdentity.integration_id,capability_id:capabilityIdentity.capability_id,integration_name:'demo',action_name:'repo.read',observed_at:'2026-08-27T04:00:00.000Z',lifecycle_state:'first_seen',drift_categories:['capability_expansion'],previous_observation_id:null,snapshot:{state:'read_only',consequence:'read_only',secret_or_identity_related:false,schema_digest:'sha256:x',classification_basis:{state:'declared:readOnlyHint=true'},transport:'stdio',evidence:{...capabilityEvidence,observed_at:'2026-08-27T04:00:00.000Z',evidence_classes:['runtime_discovery','historical_observation']}}};
assert.equal(validateCapabilityObservation(capabilityObservation).valid,true);
assert.equal(validateCapabilityObservation({...capabilityObservation,lifecycle_state:'removed'}).valid,false);
assert.equal(validateCapabilityObservation({...capabilityObservation,drift_categories:['capability_expansion','capability_expansion']}).valid,false);
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/capability-observation.schema.json',import.meta.url))));
const capabilityManifestV12={manifest_version:'1.2',identity:{name:'demo',integration_id:capabilityIdentity.integration_id,identity_basis:'explicit'},provenance:{source_kind:'remote-service',mutability:'remote-can-change-without-local-update'},tools:[{name:'repo.read',state:'read_only',consequence:'read_only',schema_digest:'sha256:x',capability_id:capabilityIdentity.capability_id,capability_identity:capabilityIdentity,evidence:capabilityEvidence}],summary:{total:1},fingerprint:'sha256:y'};
assert.equal(validateCapabilityManifest(capabilityManifestV12).valid,true);
assert.equal(validateCapabilityManifest({...capabilityManifestV12,identity:{...capabilityManifestV12.identity,integration_id:'sha256:'+'d'.repeat(64)}}).valid,false);


const authorityGraph={graph_version:'1.0',graph_id:'sha256:'+'e'.repeat(64),generated_at:null,nodes:[{node_id:'principal:agent-a',kind:'principal',ref_id:'agent-a',data:{type:'agent'}}],edges:[],unresolved_references:[]};
assert.equal(validateAuthorityGraph(authorityGraph).valid,true);
assert.equal(validateAuthorityGraph({...authorityGraph,nodes:[...authorityGraph.nodes,...authorityGraph.nodes]}).valid,false);



const evidenceGraphProtocol={evidence_graph_version:'1.0',graph_id:'sha256:'+'f'.repeat(64),generated_at:null,source:{authority_graph_id:authorityGraph.graph_id,evidence_event_count:0,evidence_chain_final_hash:'GENESIS',evidence_verified:true},nodes:[{node_id:'principal:agent-a',kind:'principal',ref_id:'agent-a',occurred_at:null,data:{type:'agent'}}],edges:[],unresolved_references:[]};
assert.equal(validateEvidenceGraph(evidenceGraphProtocol).valid,true);
assert.equal(validateEvidenceGraph({...evidenceGraphProtocol,source:{...evidenceGraphProtocol.source,evidence_verified:false}}).valid,false);
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/evidence-graph.schema.json',import.meta.url))));

const p20 = await import('../src/index.js');
assert.equal(p20.validateAuthorityEnvelope({envelope_version:'1.0',envelope_id:'e',grant_id:'g',principal_chain:[{type:'agent',id:'a'}],capabilities:[{actions:['resource.read'],resources:['**']}],issued_at:'2026-01-01T00:00:00Z',not_before:'2026-01-01T00:00:00Z',expires_at:'2026-01-01T01:00:00Z',constraints:{},obligations:[]}).valid,true);
assert.equal(p20.validateExecutionLease({lease_version:'1.0',lease_id:'l',decision_id:'d',principal_id:'a',authority_envelope_id:null,authority_grant_id:null,action_digest:'sha256:a',policy_digest:'sha256:p',canonical_action:'resource.read',canonical_resource:'ruleoak://file/x',issued_at:'2026-01-01T00:00:00Z',not_before:'2026-01-01T00:00:00Z',expires_at:'2026-01-01T00:01:00Z',max_uses:1,budget:{},obligations:[],nonce:'n'}).valid,true);
assert.equal(p20.validateEffectReceipt({effect_version:'1.0',effect_id:'x',lease_id:'l',decision_id:'d',adapter:'test',started_at:'2026-01-01T00:00:00Z',completed_at:'2026-01-01T00:00:01Z',status:'success',observation_quality:'complete-for-adapter',observed:{}}).valid,true);
assert.equal(validateEffectReceipt({effect_version:'1.1',effect_id:'x2',lease_id:'l',decision_id:'d',adapter:'test',adapter_contract_version:'1.1',started_at:'2026-01-01T00:00:00Z',completed_at:'2026-01-01T00:00:01Z',status:'unknown',observation_quality:'remote_response_observed',observation_boundary:'remote-response',observed:{}}).valid,true);
assert.equal(validateEffectReceipt({effect_version:'1.1',effect_id:'x3',lease_id:'l',decision_id:'d',adapter:'test',adapter_contract_version:'1.1',started_at:'2026-01-01T00:00:00Z',completed_at:'2026-01-01T00:00:01Z',status:'success',observation_quality:'requested_only',observation_boundary:'request-only',observed:{}}).valid,false);

const capabilityManifest={manifest_version:'1.1',identity:{name:'demo'},provenance:{source_kind:'local-manifest',mutability:'local-file-controlled-by-user'},tools:[{name:'repo.read',state:'read_only',consequence:'read_only',schema_digest:'sha256:x'}],summary:{total:1},fingerprint:'sha256:y'};assert.equal(validateCapabilityManifest(capabilityManifest).valid,true);assert.equal(validateCapabilityManifest({...capabilityManifest,provenance:null}).valid,false);assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/capability-manifest.schema.json',import.meta.url))));

{
  const good = validateExtensionDescriptor({spi_version:'1.0',extension_id:'example',kind:'event_sink',data_access:['effect_metadata'],network:'none'});
  assert.equal(good.valid,true);
  const bad = validateExtensionDescriptor({spi_version:'1.0',extension_id:'bad',kind:'event_sink',data_access:['source_code'],network:'none'});
  assert.equal(bad.valid,false);
}

// Delegation & Revocation protocol contracts.
const authorityGrantV11={...authorityGrant,grant_version:'1.1',ancestor_grant_ids:[],budget:{max_executions:2,max_objects:5},obligations:[{type:'require_recorder'},{type:'execution_before',deadline:'2026-08-14T00:30:00.000Z'}],delegation:{allowed:true,max_depth:2,budget_mode:'partition'}};
assert.equal(validateAuthorityGrant(authorityGrantV11).valid,true);
assert.equal(validateAuthorityGrant({...authorityGrantV11,ancestor_grant_ids:undefined}).valid,false);
assert.equal(validateAuthorityGrant({...authorityGrantV11,obligations:[{type:'require_recorder',raw:'not-allowed'}]}).valid,false);
assert.equal(validateAuthorityGrant({...authorityGrantV11,principal_chain:[{type:'user'}]}).valid,false);
assert.equal(validateNormalizedToolCall({...normalized,actor:{...normalized.actor,type:'service'}}).valid,true);
const leaseV11={lease_version:'1.1',lease_id:'l11',decision_id:'d',principal_id:'agent:test',authority_envelope_id:null,authority_grant_id:'grant_test',authority_ancestor_grant_ids:['grant_parent'],authority_principal_ids:['user:owner','agent:test'],action_digest:'sha256:a',policy_digest:'sha256:p',canonical_action:'resource.read',canonical_resource:'ruleoak://file/x',issued_at:'2026-01-01T00:00:00Z',not_before:'2026-01-01T00:00:00Z',expires_at:'2026-01-01T00:01:00Z',max_uses:1,budget:{max_executions:1,max_objects:1},obligations:[{type:'require_effect_receipt'}],nonce:'n'};
assert.equal(validateExecutionLease(leaseV11).valid,true);
assert.equal(validateExecutionLease({...leaseV11,authority_ancestor_grant_ids:undefined}).valid,false);
assert.equal(validateExecutionLease({...leaseV11,max_uses:2}).valid,false);
assert.equal(validateEffectReceipt({effect_version:'1.0',effect_id:'badtime',lease_id:'l',decision_id:'d',adapter:'x',started_at:'nope',completed_at:'2026-01-01T00:00:01Z',status:'success',observation_quality:'partial',observed:{}}).valid,false);

// Approval Contract protocol contracts.
const approvalRequest={approval_request_version:'1.0',approval_id:'appr_test',request_decision_id:'dec_pending',request_digest:'sha256:'+'1'.repeat(64),issuer:'ruleoak',audience:'approval-provider:test',provider_id:'provider:test',requested_at:'2026-08-27T05:00:00.000Z',not_before:'2026-08-27T05:00:00.000Z',expires_at:'2026-08-27T05:05:00.000Z',one_time:true,request_nonce:'n',action_digest:'sha256:'+'2'.repeat(64),policy_digest:'sha256:'+'3'.repeat(64),principal_id:'agent:test',risk:'medium'};
assert.equal(validateApprovalRequest(approvalRequest).valid,true);
assert.equal(validateApprovalRequest({...approvalRequest,provider_id:''}).valid,false);
const approvalResult={approval_result_version:'1.0',approval_result_id:'apprr_test',approval_id:'appr_test',request_decision_id:'dec_pending',request_digest:approvalRequest.request_digest,result_digest:'sha256:'+'4'.repeat(64),action_digest:approvalRequest.action_digest,policy_digest:approvalRequest.policy_digest,principal_id:'agent:test',provider_id:'provider:test',approver:{type:'user',id:'user:reviewer'},decision:'allow',decided_at:'2026-08-27T05:01:00.000Z',not_before:'2026-08-27T05:01:00.000Z',expires_at:'2026-08-27T05:04:00.000Z',one_time:true,result_nonce:'r'};
assert.equal(validateApprovalResult(approvalResult).valid,true);
assert.equal(validateApprovalResult({...approvalResult,decision:'allow_once'}).valid,false);
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/approval-request.schema.json',import.meta.url))));
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/approval-result.schema.json',import.meta.url))));
const approvedDecision={receipt_version:'1.2',decision_id:'dec_allow',nonce:'n2',issuer:'ruleoak',audience:'exec',one_time:true,evaluated_at:'2026-08-27T05:01:00.000Z',not_before:'2026-08-27T05:01:00.000Z',expires_at:'2026-08-27T05:04:00.000Z',action_digest:approvalRequest.action_digest,policy_digest:approvalRequest.policy_digest,decision:'allow',risk:'medium',approval_id:'appr_test',approval_result_id:'apprr_test',approval_request_decision_id:'dec_pending',approval_provider_id:'provider:test'};
assert.equal(validateDecisionReceipt(approvedDecision).valid,true);
const leaseV12={...leaseV11,lease_version:'1.2',approval_id:'appr_test',approval_result_id:'apprr_test'};
assert.equal(validateExecutionLease(leaseV12).valid,true);
assert.equal(validateExecutionLease({...leaseV12,approval_result_id:undefined}).valid,false);


const bundleManifest={bundle_version:'3.0',bundle_id:'sha256:'+'a'.repeat(64),created_at:'2026-08-27T00:00:00.000Z',privacy_profile:'minimal',source:{evidence_sha256:'sha256:'+'b'.repeat(64),event_count:0,final_hash:'GENESIS',first_event_at:null,last_event_at:null,chain_verified_at_export:true,raw_evidence_included:false},graphs:{authority_graph_id:'sha256:'+'c'.repeat(64),evidence_graph_id:'sha256:'+'d'.repeat(64)},adapters:[],files:[{path:'evidence/minimal.jsonl',size:0,sha256:'sha256:'+'e'.repeat(64),role:'minimal_timeline'}],verification:{source_chain:'verified_at_export_only',graphs:'verified_at_export_only',instructions:['verify']},privacy:{includes_raw_evidence:false,includes_policy:false,includes_workspace_state:false,includes_approval_state:false,includes_session_state:false}};
assert.equal(validateEvidenceBundleManifest(bundleManifest).valid,true);
assert.equal(validateEvidenceBundleManifest({...bundleManifest,files:[{...bundleManifest.files[0],path:'../escape'}]}).valid,false);



// Public adapter and revocation protocol contracts.
const adapterDescriptorV11={contract_version:'1.1',adapter_id:'public-test',mode:'execute',observation_capabilities:[{quality:'remote_response_observed',boundary:'public-test-response',statuses:['unknown']}]};
assert.equal(validateAdapterDescriptor(adapterDescriptorV11).valid,true);
assert.equal(validateAdapterDescriptor({...adapterDescriptorV11,mode:'normalize'}).valid,false);
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/adapter-descriptor.schema.json',import.meta.url))));
const revocationRecordV11={revocation_version:'1.1',revocation_id:'revoke_test',sequence:1,subject_type:'execution_lease',subject_id:'lease_test',revoked_at:'2026-08-28T00:00:00.000Z',reason:'test',cascade:false,parent_id:null,record_digest:'sha256:'+'a'.repeat(64)};
assert.equal(validateRevocationRecord(revocationRecordV11).valid,true);
assert.equal(validateRevocationRecord({...revocationRecordV11,subject_type:'unknown'}).valid,false);
assert.deepEqual(revocationRecordDigestPayload(revocationRecordV11),Object.fromEntries(Object.entries(revocationRecordV11).filter(([key])=>key!=='record_digest')));
assert.equal(canonicalProtocolJson({z:1,a:{y:2,x:3}}),'{"a":{"x":3,"y":2},"z":1}');
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/revocation-record.schema.json',import.meta.url))));

// Failure Taxonomy & Scenario Contract protocol coverage.
const crashlabProtocol = await import('../src/index.js');
const crashlabV2={scenario_version:'2.0',scenario_id:'protocol.response-loss',name:'Protocol response loss',target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.create',resource:'synthetic://x',idempotency:'required',idempotency_key:'x'},authority:{initial_state:'valid'},fault:{phase:'after_effect_before_response',class:'response_loss',on_attempt:1,repeat:'once'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:true},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['duplicate_effect_resistance','retry_boundedness','ambiguity_preservation','evidence_completeness']}};
assert.equal(crashlabProtocol.validateCrashLabScenario(crashlabV2).valid,true);
assert.equal(crashlabProtocol.validateCrashLabScenario({...crashlabV2,fault:{...crashlabV2.fault,class:'invented'}}).valid,false);
assert.equal(crashlabProtocol.validateCrashLabScenario({...crashlabV2,retry:{...crashlabV2.retry,strategy:'none',max_attempts:2}}).valid,false);
assert.ok(crashlabProtocol.CRASHLAB_FAILURE_CLASSES.includes('concurrent_race'));
assert.ok(crashlabProtocol.CRASHLAB_FAILURE_CLASSES.includes('stale_policy'));
assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL('../schemas/crashlab-scenario.schema.json',import.meta.url))));

console.log('protocol tests passed');
