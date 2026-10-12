/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

export const DECISIONS = ['allow', 'deny', 'block', 'needs_approval', 'dry_run_only'];
export const CANONICAL_DECISIONS = ['allow', 'deny', 'needs_approval', 'dry_run_only'];
export const RISK_LEVELS = ['safe', 'low', 'medium', 'high', 'critical'];
export const ACTOR_TYPES = ['agent', 'user', 'script', 'service'];
export const TOOL_CATEGORIES = ['file', 'filesystem', 'shell', 'email', 'web', 'memory', 'payment', 'calendar', 'custom'];
export const TOOL_OPERATIONS = ['read', 'write', 'delete', 'send', 'execute', 'search', 'create', 'update', 'run'];
export const SENSITIVITY_LEVELS = ['public', 'internal', 'private', 'secret', 'unknown'];
export const DATA_FLOWS = ['local', 'external', 'unknown'];
export const SIDE_EFFECTS = ['read_only', 'mutating', 'destructive', 'unknown'];
export const POLICY_EFFECTS = ['allow', 'deny', 'block', 'needs_approval', 'dry_run_only'];

export const AUTHORITY_GRANT_VERSIONS = ['1.0', '1.1'];
export const AUTHORITY_ENVELOPE_VERSIONS = ['1.0'];
export const EXECUTION_LEASE_VERSIONS = ['1.0', '1.1', '1.2'];
export const APPROVAL_REQUEST_VERSIONS = ['1.0'];
export const APPROVAL_RESULT_VERSIONS = ['1.0'];
export const APPROVAL_RESULT_DECISIONS = ['allow', 'deny'];
export const EFFECT_RECEIPT_VERSIONS = ['1.0', '1.1'];
export const LEGACY_OBSERVATION_QUALITIES = ['complete-for-adapter', 'partial', 'inferred', 'unavailable'];
export const OBSERVATION_QUALITIES = ['requested_only', 'process_return_observed', 'local_state_observed', 'remote_response_observed', 'complete_for_adapter', 'partial', 'ambiguous'];
export const EVIDENCE_BUNDLE_VERSIONS = ['3.0'];
export const EVIDENCE_PRIVACY_PROFILES = ['minimal','operational','forensic_local'];
export const EVIDENCE_BUNDLE_FILE_ROLES = ['minimal_timeline','raw_evidence','graph_summary','authority_graph','evidence_graph','policy','workspace','approval_state','session_state','authority_state','supporting_state','report','other'];
export const AUTHORITY_PRINCIPAL_TYPES = ['user', 'agent', 'script', 'service', 'organization'];
export const ADAPTER_CONTRACT_VERSIONS = Object.freeze(['1.0','1.1']);
export const REVOCATION_RECORD_VERSIONS = Object.freeze(['1.0','1.1']);
export const REVOCATION_SUBJECT_TYPES = Object.freeze(['principal','authority_grant','authority_envelope','execution_lease','session']);

export function canonicalProtocolJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalProtocolJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalProtocolJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function revocationRecordDigestPayload(record = {}) {
  if (!isObject(record)) return record;
  const { record_digest: _ignored, ...payload } = record;
  return payload;
}

const POLICY_CONDITION_ENUMS = Object.freeze({
  categories: TOOL_CATEGORIES,
  operations: TOOL_OPERATIONS,
  sensitivities: SENSITIVITY_LEVELS,
  dataFlows: DATA_FLOWS,
  sideEffects: SIDE_EFFECTS,
  actorTypes: ACTOR_TYPES
});

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeDecisionAction(value) {
  return value === 'block' ? 'deny' : value;
}

function validateStringArray(value, path, errors, { nonEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  if (nonEmpty && value.length === 0) errors.push(`${path} must not be empty`);
  if (value.some(item => typeof item !== 'string' || item.length === 0)) errors.push(`${path} must contain non-empty strings`);
}

export function validateActionEnvelope(action) {
  const errors = [];
  if (!isObject(action)) errors.push('action must be an object');
  if (isObject(action)) {
    const hasType = typeof action.type === 'string' && action.type.length > 0;
    const hasAction = typeof action.action === 'string' && action.action.length > 0;
    if (!hasType && !hasAction) errors.push('action.type is required');
    if (action.type !== undefined && typeof action.type !== 'string') errors.push('action.type must be a string when present');
    if (action.action !== undefined && typeof action.action !== 'string') errors.push('action.action must be a string when present');
    if (action.target !== undefined && typeof action.target !== 'string') errors.push('action.target must be a string when present');
    if (action.arguments !== undefined && !isObject(action.arguments)) errors.push('action.arguments must be an object when present');
    if (action.metadata !== undefined && !isObject(action.metadata)) errors.push('action.metadata must be an object when present');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

function validateExactActionRules(rules, errors) {
  if (!Array.isArray(rules)) {
    errors.push('policy.exactActionRules must be an array when present');
    return;
  }
  rules.forEach((rule, index) => {
    const path = `policy.exactActionRules[${index}]`;
    if (!isObject(rule)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (typeof rule.decision_key !== 'string' || rule.decision_key.length === 0) errors.push(`${path}.decision_key is required`);
    if (!['allow', 'deny', 'block', 'needs_approval'].includes(rule.effect)) errors.push(`${path}.effect is invalid`);
    if (rule.disabled !== undefined && typeof rule.disabled !== 'boolean') errors.push(`${path}.disabled must be a boolean when present`);
    if (rule.status !== undefined && !['enabled', 'disabled'].includes(rule.status)) errors.push(`${path}.status is invalid`);
    if (rule.allowCritical !== undefined && typeof rule.allowCritical !== 'boolean') errors.push(`${path}.allowCritical must be a boolean when present`);
    for (const field of ['id', 'tool', 'target', 'source_suggestion_id', 'source_approval_id', 'created_at', 'disabled_at', 'reenabled_at', 'description']) {
      if (rule[field] !== undefined && typeof rule[field] !== 'string') errors.push(`${path}.${field} must be a string when present`);
    }
  });
}

function validateStructuredRules(rules, errors) {
  if (!Array.isArray(rules)) {
    errors.push('policy.rules must be an array when present');
    return;
  }
  rules.forEach((rule, index) => {
    const path = `policy.rules[${index}]`;
    if (!isObject(rule)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (typeof rule.id !== 'string' || rule.id.length === 0) errors.push(`${path}.id is required`);
    if (!POLICY_EFFECTS.includes(rule.effect)) errors.push(`${path}.effect is invalid`);
    if (rule.actions !== undefined) validateStringArray(rule.actions, `${path}.actions`, errors, { nonEmpty: true });
    if (rule.resources !== undefined) validateStringArray(rule.resources, `${path}.resources`, errors, { nonEmpty: true });
    if (rule.priority !== undefined && !Number.isInteger(rule.priority)) errors.push(`${path}.priority must be an integer when present`);
    if (rule.disabled !== undefined && typeof rule.disabled !== 'boolean') errors.push(`${path}.disabled must be a boolean when present`);
    if (rule.status !== undefined && !['enabled', 'disabled'].includes(rule.status)) errors.push(`${path}.status is invalid`);
    if (rule.allowCritical !== undefined && typeof rule.allowCritical !== 'boolean') errors.push(`${path}.allowCritical must be a boolean when present`);
    if (rule.riskAtLeast !== undefined && !RISK_LEVELS.includes(rule.riskAtLeast)) errors.push(`${path}.riskAtLeast is invalid`);
    if (rule.riskAtMost !== undefined && !RISK_LEVELS.includes(rule.riskAtMost)) errors.push(`${path}.riskAtMost is invalid`);
    for (const field of ['description', 'created_at']) {
      if (rule[field] !== undefined && typeof rule[field] !== 'string') errors.push(`${path}.${field} must be a string when present`);
    }
    if (rule.conditions !== undefined) {
      if (!isObject(rule.conditions)) errors.push(`${path}.conditions must be an object when present`);
      else {
        for (const [key, allowed] of Object.entries(POLICY_CONDITION_ENUMS)) {
          if (rule.conditions[key] !== undefined) {
            validateStringArray(rule.conditions[key], `${path}.conditions.${key}`, errors, { nonEmpty: true });
            if (Array.isArray(rule.conditions[key])) {
              for (const value of rule.conditions[key]) if (!allowed.includes(value)) errors.push(`${path}.conditions.${key} contains invalid value: ${value}`);
            }
          }
        }
        for (const key of ['scopes', 'actorNames', 'sessionIds', 'agentIds', 'principalIds', 'grantIds', 'intentIds', 'taskIds']) {
          if (rule.conditions[key] !== undefined) validateStringArray(rule.conditions[key], `${path}.conditions.${key}`, errors, { nonEmpty: true });
        }
      }
    }
  });
}

export function validatePolicy(policy) {
  const errors = [];
  if (!isObject(policy)) errors.push('policy must be an object');
  if (isObject(policy)) {
    if (policy.policyVersion !== undefined && (!Number.isInteger(policy.policyVersion) || ![1, 2].includes(policy.policyVersion))) {
      errors.push('policy.policyVersion must be 1 or 2 when present');
    }
    if (policy.defaultAction !== undefined && !POLICY_EFFECTS.includes(policy.defaultAction)) errors.push('policy.defaultAction is invalid');
    for (const key of ['allowedActions', 'approvalRequired', 'blockedActions']) {
      if (policy[key] !== undefined) validateStringArray(policy[key], `policy.${key}`, errors);
    }
    if (policy.exactActionRules !== undefined) validateExactActionRules(policy.exactActionRules, errors);
    if (policy.rules !== undefined) validateStructuredRules(policy.rules, errors);
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export const validatePolicyStructure = validatePolicy;

export function validateNormalizedToolCall(call) {
  const errors = [];
  if (!isObject(call)) errors.push('normalized tool call must be an object');
  if (isObject(call)) {
    if (typeof call.call_id !== 'string' || call.call_id.length === 0) errors.push('call_id is required');
    if (typeof call.timestamp !== 'string' || call.timestamp.length === 0) errors.push('timestamp is required');
    if (!isObject(call.actor)) errors.push('actor is required');
    else {
      if (!ACTOR_TYPES.includes(call.actor.type)) errors.push('actor.type is invalid');
      if (typeof call.actor.name !== 'string' || call.actor.name.length === 0) errors.push('actor.name is required');
      if (typeof call.actor.session_id !== 'string' || call.actor.session_id.length === 0) errors.push('actor.session_id is required');
      if (call.actor.id !== undefined && (typeof call.actor.id !== 'string' || call.actor.id.length === 0)) errors.push('actor.id must be a non-empty string when present');
      if (call.actor.issuer !== undefined && (typeof call.actor.issuer !== 'string' || call.actor.issuer.length === 0)) errors.push('actor.issuer must be a non-empty string when present');
    }
    if (!isObject(call.tool)) errors.push('tool is required');
    else {
      if (typeof call.tool.name !== 'string' || call.tool.name.length === 0) errors.push('tool.name is required');
      if (!TOOL_CATEGORIES.includes(call.tool.category)) errors.push('tool.category is invalid');
      if (!TOOL_OPERATIONS.includes(call.tool.operation)) errors.push('tool.operation is invalid');
    }
    if (!isObject(call.target)) errors.push('target is required');
    else {
      if (typeof call.target.resource !== 'string') errors.push('target.resource must be a string');
      if (typeof call.target.scope !== 'string') errors.push('target.scope must be a string');
      if (!SENSITIVITY_LEVELS.includes(call.target.sensitivity)) errors.push('target.sensitivity is invalid');
    }
    if (call.arguments !== undefined && !isObject(call.arguments)) errors.push('arguments must be an object when present');
    if (call.context !== undefined && !isObject(call.context)) errors.push('context must be an object when present');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}



const AUTHORITY_BUDGET_FIELDS = ['max_executions','max_objects','max_bytes','max_amount','max_external_calls'];
const AUTHORITY_OBLIGATION_TYPES = ['require_approval','require_effect_receipt','require_recorder','execution_before','target_verified'];
export const DELEGATION_BUDGET_MODES = ['inherit','partition'];
export const MAX_AUTHORITY_DELEGATION_DEPTH = 32;
function validateAuthorityBudgetShape(value,path,errors){
  if(!isObject(value)){errors.push(`${path} must be an object`);return;}
  for(const key of Object.keys(value))if(!AUTHORITY_BUDGET_FIELDS.includes(key))errors.push(`${path}.${key} is not supported`);
  for(const field of AUTHORITY_BUDGET_FIELDS){if(value[field]===undefined)continue;const n=Number(value[field]);if(!Number.isFinite(n)||n<0)errors.push(`${path}.${field} must be a non-negative finite number`);else if(field!=='max_amount'&&!Number.isInteger(n))errors.push(`${path}.${field} must be an integer`);}
}
function validateAuthorityObligationsShape(value,path,errors){
  if(!Array.isArray(value)){errors.push(`${path} must be an array`);return;}
  value.forEach((o,i)=>{const p=`${path}[${i}]`;if(!isObject(o)){errors.push(`${p} must be an object`);return;}if(!AUTHORITY_OBLIGATION_TYPES.includes(o.type))errors.push(`${p}.type is invalid`);const allowed=o.type==='execution_before'?['type','deadline']:['type'];for(const key of Object.keys(o))if(!allowed.includes(key))errors.push(`${p}.${key} is not supported`);if(o.type==='execution_before'&&(typeof o.deadline!=='string'||!Number.isFinite(Date.parse(o.deadline))))errors.push(`${p}.deadline must be a valid date-time`);});
}
function validateIsoField(value,path,errors){if(typeof value!=='string'||!value){errors.push(`${path} is required`);return NaN;}const t=Date.parse(value);if(!Number.isFinite(t))errors.push(`${path} must be a valid date-time`);return t;}

export function validateAuthorityGrant(grant) {
  const errors = [];
  if (!isObject(grant)) errors.push('authority grant must be an object');
  if (isObject(grant)) {
    if (!AUTHORITY_GRANT_VERSIONS.includes(grant.grant_version)) errors.push('grant_version must be 1.0 or 1.1');
    for (const field of ['grant_id', 'issuer']) if (typeof grant[field] !== 'string' || grant[field].length === 0) errors.push(`${field} is required`);
    const issuedAt=validateIsoField(grant.issued_at,'issued_at',errors), notBefore=validateIsoField(grant.not_before,'not_before',errors), expiresAt=validateIsoField(grant.expires_at,'expires_at',errors);
    if(Number.isFinite(issuedAt)&&Number.isFinite(notBefore)&&notBefore<issuedAt)errors.push('not_before must not precede issued_at');
    if(Number.isFinite(notBefore)&&Number.isFinite(expiresAt)&&expiresAt<=notBefore)errors.push('expires_at must be after not_before');
    if (!isObject(grant.subject)) errors.push('subject is required');
    else {
      if (!AUTHORITY_PRINCIPAL_TYPES.includes(grant.subject.type)) errors.push('subject.type is invalid');
      if (typeof grant.subject.id !== 'string' || grant.subject.id.length === 0) errors.push('subject.id is required');
      if (grant.subject.name !== undefined && typeof grant.subject.name !== 'string') errors.push('subject.name must be a string when present');
      if (grant.subject.issuer !== undefined && typeof grant.subject.issuer !== 'string') errors.push('subject.issuer must be a string when present');
    }
    if (!Array.isArray(grant.principal_chain) || grant.principal_chain.length === 0) errors.push('principal_chain must be a non-empty array');
    else grant.principal_chain.forEach((principal, index) => {
      const path = `principal_chain[${index}]`;
      if (!isObject(principal)) errors.push(`${path} must be an object`);
      else { if (!AUTHORITY_PRINCIPAL_TYPES.includes(principal.type)) errors.push(`${path}.type is invalid`); if (typeof principal.id !== 'string' || principal.id.length === 0) errors.push(`${path}.id is required`); }
    });
    if (Array.isArray(grant.principal_chain) && grant.principal_chain.length > 0 && isObject(grant.subject)) {
      const last = grant.principal_chain[grant.principal_chain.length - 1];
      if (isObject(last) && (last.id !== grant.subject.id || last.type !== grant.subject.type)) errors.push('principal_chain must end with subject');
    }
    if (!Array.isArray(grant.capabilities) || grant.capabilities.length === 0) errors.push('capabilities must be a non-empty array');
    else grant.capabilities.forEach((capability, index) => {
      const path = `capabilities[${index}]`;
      if (!isObject(capability)) errors.push(`${path} must be an object`);
      else { if (capability.id !== undefined && (typeof capability.id !== 'string' || capability.id.length === 0)) errors.push(`${path}.id must be a non-empty string when present`); validateStringArray(capability.actions, `${path}.actions`, errors, { nonEmpty: true }); validateStringArray(capability.resources, `${path}.resources`, errors, { nonEmpty: true }); }
    });
    if (grant.parent_grant_id !== undefined && grant.parent_grant_id !== null && (typeof grant.parent_grant_id !== 'string' || !grant.parent_grant_id)) errors.push('parent_grant_id must be a non-empty string or null when present');
    if (!Number.isInteger(grant.delegation_depth) || grant.delegation_depth < 0 || grant.delegation_depth > MAX_AUTHORITY_DELEGATION_DEPTH) errors.push(`delegation_depth must be an integer from 0 to ${MAX_AUTHORITY_DELEGATION_DEPTH}`);
    if((grant.parent_grant_id===null||grant.parent_grant_id===undefined)&&grant.delegation_depth!==0)errors.push('root authority grant must have delegation_depth 0');
    if(typeof grant.parent_grant_id==='string'&&grant.parent_grant_id&&grant.delegation_depth<1)errors.push('delegated authority grant must have delegation_depth >= 1');
    for (const field of ['task_id', 'intent_id', 'session_id', 'signature']) if (grant[field] !== undefined && typeof grant[field] !== 'string') errors.push(`${field} must be a string when present`);
    if(grant.grant_version==='1.1'){
      if(!Array.isArray(grant.ancestor_grant_ids))errors.push('ancestor_grant_ids must be an array for grant_version 1.1');
      else{
        if(grant.ancestor_grant_ids.some(id=>typeof id!=='string'||!id))errors.push('ancestor_grant_ids must contain non-empty strings');
        if(new Set(grant.ancestor_grant_ids).size!==grant.ancestor_grant_ids.length)errors.push('ancestor_grant_ids must not contain duplicates');
        if(Number.isInteger(grant.delegation_depth)&&grant.ancestor_grant_ids.length!==grant.delegation_depth)errors.push('ancestor_grant_ids length must equal delegation_depth');
        if(grant.delegation_depth>0&&grant.ancestor_grant_ids.at(-1)!==grant.parent_grant_id)errors.push('ancestor_grant_ids must end with parent_grant_id');
      }
      if(Array.isArray(grant.principal_chain)){
        const principalIds=grant.principal_chain.map(p=>p?.id).filter(id=>typeof id==='string');
        if(new Set(principalIds).size!==principalIds.length)errors.push('principal_chain principal IDs must be unique for grant_version 1.1');
      }
      if(Array.isArray(grant.ancestor_grant_ids)&&grant.ancestor_grant_ids.includes(grant.grant_id))errors.push('ancestor_grant_ids must not include grant_id');
      validateAuthorityBudgetShape(grant.budget,'budget',errors);
      validateAuthorityObligationsShape(grant.obligations,'obligations',errors);
      if(!isObject(grant.delegation))errors.push('delegation is required for grant_version 1.1');
      else{
        if(typeof grant.delegation.allowed!=='boolean')errors.push('delegation.allowed must be boolean');
        if(!Number.isInteger(grant.delegation.max_depth)||grant.delegation.max_depth<0||grant.delegation.max_depth>MAX_AUTHORITY_DELEGATION_DEPTH)errors.push(`delegation.max_depth must be an integer from 0 to ${MAX_AUTHORITY_DELEGATION_DEPTH}`);
        else if(Number.isInteger(grant.delegation_depth)&&grant.delegation.max_depth<grant.delegation_depth)errors.push('delegation.max_depth must not be below delegation_depth');
        if(grant.delegation.allowed===true&&Number.isInteger(grant.delegation.max_depth)&&Number.isInteger(grant.delegation_depth)&&grant.delegation.max_depth<=grant.delegation_depth)errors.push('delegation.allowed requires max_depth greater than delegation_depth');
        if(!DELEGATION_BUDGET_MODES.includes(grant.delegation.budget_mode))errors.push('delegation.budget_mode must be inherit or partition');
      }
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function validateAuthorityEnvelope(envelope) {
  const errors=[];
  if(!isObject(envelope)) errors.push('authority envelope must be an object');
  if(isObject(envelope)) {
    if(!AUTHORITY_ENVELOPE_VERSIONS.includes(envelope.envelope_version)) errors.push('envelope_version must be 1.0');
    for(const field of ['envelope_id','grant_id','issued_at','not_before','expires_at']) if(typeof envelope[field] !== 'string' || !envelope[field]) errors.push(`${field} is required`);
    if(!Array.isArray(envelope.principal_chain)||!envelope.principal_chain.length) errors.push('principal_chain must be a non-empty array');
    if(!Array.isArray(envelope.capabilities)||!envelope.capabilities.length) errors.push('capabilities must be a non-empty array');
    else envelope.capabilities.forEach((cap,index)=>{if(!isObject(cap)) errors.push(`capabilities[${index}] must be an object`); else {validateStringArray(cap.actions,`capabilities[${index}].actions`,errors,{nonEmpty:true});validateStringArray(cap.resources,`capabilities[${index}].resources`,errors,{nonEmpty:true});}});
    if(!isObject(envelope.constraints)) errors.push('constraints must be an object');
    if(!Array.isArray(envelope.obligations)) errors.push('obligations must be an array');
    const issued=validateIsoField(envelope.issued_at,'issued_at',errors), start=validateIsoField(envelope.not_before,'not_before',errors), end=validateIsoField(envelope.expires_at,'expires_at',errors);if(Number.isFinite(issued)&&Number.isFinite(start)&&start<issued)errors.push('not_before must not precede issued_at');if(Number.isFinite(start)&&Number.isFinite(end)&&end<=start) errors.push('expires_at must be after not_before');
    if(envelope.signature!==undefined&&typeof envelope.signature!=='string') errors.push('signature must be a string when present');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export function validateExecutionLease(lease) {
  const errors=[];
  if(!isObject(lease)) errors.push('execution lease must be an object');
  if(isObject(lease)) {
    if(!EXECUTION_LEASE_VERSIONS.includes(lease.lease_version)) errors.push('lease_version must be 1.0, 1.1, or 1.2');
    for(const field of ['lease_id','decision_id','principal_id','action_digest','policy_digest','canonical_action','canonical_resource','issued_at','not_before','expires_at','nonce']) if(typeof lease[field]!=='string'||!lease[field]) errors.push(`${field} is required`);
    if(lease.max_uses!==1) errors.push('max_uses must be exactly 1 for one-use ExecutionLease v1');
    if(lease.budget!==undefined&&!isObject(lease.budget)) errors.push('budget must be an object when present');
    if(lease.obligations!==undefined&&!Array.isArray(lease.obligations)) errors.push('obligations must be an array when present');
    if(lease.signature!==undefined&&typeof lease.signature!=='string') errors.push('signature must be a string when present');
    if(lease.lease_version==='1.2'){for(const field of ['approval_id','approval_result_id'])if(typeof lease[field]!=='string'||!lease[field])errors.push(`${field} is required for lease_version 1.2`);}
    const issued=validateIsoField(lease.issued_at,'issued_at',errors), start=validateIsoField(lease.not_before,'not_before',errors), end=validateIsoField(lease.expires_at,'expires_at',errors);if(Number.isFinite(issued)&&Number.isFinite(start)&&start<issued)errors.push('not_before must not precede issued_at');if(Number.isFinite(start)&&Number.isFinite(end)&&end<=start) errors.push('expires_at must be after not_before');if(lease.lease_version==='1.1'||lease.lease_version==='1.2'){if(!Array.isArray(lease.authority_ancestor_grant_ids)||lease.authority_ancestor_grant_ids.some(x=>typeof x!=='string'||!x))errors.push('authority_ancestor_grant_ids must be an array of non-empty strings for lease_version 1.1');if(!Array.isArray(lease.authority_principal_ids)||lease.authority_principal_ids.some(x=>typeof x!=='string'||!x))errors.push('authority_principal_ids must be an array of non-empty strings for lease_version 1.1');}
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export function validateEffectReceipt(receipt) {
  const errors=[];
  if(!isObject(receipt)) errors.push('effect receipt must be an object');
  if(isObject(receipt)) {
    const allowed=new Set(['effect_version','effect_id','lease_id','decision_id','adapter','adapter_contract_version','started_at','completed_at','status','observation_quality','observation_boundary','requested','observed','error','signature']);
    for(const key of Object.keys(receipt))if(!allowed.has(key))errors.push(`effect receipt field ${key} is not allowed`);
    if(!EFFECT_RECEIPT_VERSIONS.includes(receipt.effect_version)) errors.push('effect_version must be 1.0 or 1.1');
    for(const field of ['effect_id','lease_id','decision_id','adapter','started_at','completed_at','status','observation_quality']) if(typeof receipt[field]!=='string'||!receipt[field]) errors.push(`${field} is required`);
    if(receipt.status&&!['success','failure','partial','unknown'].includes(receipt.status)) errors.push('status is invalid');
    if(receipt.effect_version==='1.0'){
      if(receipt.observation_quality&&!LEGACY_OBSERVATION_QUALITIES.includes(receipt.observation_quality)) errors.push('observation_quality is invalid for effect_version 1.0');
      if(receipt.observation_boundary!==undefined)errors.push('observation_boundary is not allowed for effect_version 1.0');if(receipt.adapter_contract_version!==undefined)errors.push('adapter_contract_version is not allowed for effect_version 1.0');
    }
    if(receipt.effect_version==='1.1'){
      if(receipt.observation_quality&&!OBSERVATION_QUALITIES.includes(receipt.observation_quality)) errors.push('observation_quality is invalid for effect_version 1.1');
      if(receipt.adapter_contract_version!=='1.1')errors.push('adapter_contract_version must be 1.1 for effect_version 1.1');
      if(typeof receipt.observation_boundary!=='string'||!receipt.observation_boundary||receipt.observation_boundary.length>128||!/^[a-z0-9][a-z0-9._:-]*$/.test(receipt.observation_boundary))errors.push('observation_boundary must be a bounded machine-readable token for effect_version 1.1');
      if(receipt.observation_quality==='requested_only'&&receipt.status!=='unknown')errors.push('requested_only observation requires status unknown');
      if(receipt.observation_quality==='ambiguous'&&receipt.status!=='unknown')errors.push('ambiguous observation requires status unknown');
      if(receipt.observation_quality==='partial'&&!['partial','unknown'].includes(receipt.status))errors.push('partial observation requires status partial or unknown');
      if(receipt.observation_quality==='complete_for_adapter'&&receipt.status==='unknown')errors.push('complete_for_adapter observation must resolve to success, failure, or partial status');
    }
    if(!isObject(receipt.observed)) errors.push('observed must be an object');
    if(receipt.requested!==undefined&&!isObject(receipt.requested)) errors.push('requested must be an object when present');
    if(receipt.error!==undefined&&receipt.error!==null&&!isObject(receipt.error))errors.push('error must be an object or null when present');
    if(receipt.signature!==undefined&&typeof receipt.signature!=='string') errors.push('signature must be a string when present');const started=validateIsoField(receipt.started_at,'started_at',errors),completed=validateIsoField(receipt.completed_at,'completed_at',errors);if(Number.isFinite(started)&&Number.isFinite(completed)&&completed<started)errors.push('completed_at must not precede started_at');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}



function validateDigestField(value,path,errors){if(typeof value!=='string'||!/^sha256:[0-9a-f]{64}$/.test(value))errors.push(`${path} must be a sha256 digest`);}
function approvalAllowedKeys(value,allowed,path,errors){if(!isObject(value))return;for(const key of Object.keys(value))if(!allowed.includes(key))errors.push(`${path}.${key} is not allowed`);}
function approvalRequiredKeys(value,required,path,errors){if(!isObject(value))return;for(const key of required)if(!(key in value))errors.push(`${path}.${key} is required`);}
function approvalString(value,path,errors,max,{required=false,nullable=false}={}){if(value===null&&nullable)return;if(value===undefined){if(required)errors.push(`${path} is required`);return;}if(typeof value!=='string'||(required&&!value))errors.push(`${path}${required?' is required':' must be a string when present'}`);else if(value.length>max)errors.push(`${path} must be at most ${max} characters`);}
function validateApprovalPrincipal(value,path,errors){
  if(!isObject(value)){errors.push(`${path} must be an object`);return;}
  approvalAllowedKeys(value,['type','id','name','issuer'],path,errors);
  if(!AUTHORITY_PRINCIPAL_TYPES.includes(value.type))errors.push(`${path}.type is invalid`);
  approvalString(value.id,`${path}.id`,errors,256,{required:true});approvalString(value.name,`${path}.name`,errors,256);approvalString(value.issuer,`${path}.issuer`,errors,256);
}
function validateApprovalNormalizedCall(value,path,errors){
  if(!isObject(value)){errors.push(`${path} must be an object`);return;}
  approvalAllowedKeys(value,['call_id','actor','tool','target'],path,errors);approvalRequiredKeys(value,['call_id','actor','tool','target'],path,errors);
  approvalString(value.call_id,`${path}.call_id`,errors,256,{nullable:true});
  if(!isObject(value.actor))errors.push(`${path}.actor must be an object`);else{
    approvalAllowedKeys(value.actor,['type','id','name','issuer','session_id'],`${path}.actor`,errors);approvalRequiredKeys(value.actor,['type','id','name','issuer','session_id'],`${path}.actor`,errors);
    approvalString(value.actor.type,`${path}.actor.type`,errors,32,{nullable:true});if(value.actor.type!==null&&value.actor.type!==undefined&&!ACTOR_TYPES.includes(value.actor.type))errors.push(`${path}.actor.type is invalid`);
    approvalString(value.actor.id,`${path}.actor.id`,errors,256,{nullable:true});approvalString(value.actor.name,`${path}.actor.name`,errors,256,{nullable:true});approvalString(value.actor.issuer,`${path}.actor.issuer`,errors,256,{nullable:true});approvalString(value.actor.session_id,`${path}.actor.session_id`,errors,256,{nullable:true});
  }
  if(!isObject(value.tool))errors.push(`${path}.tool must be an object`);else{
    approvalAllowedKeys(value.tool,['name','category','operation'],`${path}.tool`,errors);approvalRequiredKeys(value.tool,['name','category','operation'],`${path}.tool`,errors);
    approvalString(value.tool.name,`${path}.tool.name`,errors,256,{nullable:true});approvalString(value.tool.category,`${path}.tool.category`,errors,64,{nullable:true});approvalString(value.tool.operation,`${path}.tool.operation`,errors,64,{nullable:true});
    if(value.tool.category!==null&&value.tool.category!==undefined&&!TOOL_CATEGORIES.includes(value.tool.category))errors.push(`${path}.tool.category is invalid`);if(value.tool.operation!==null&&value.tool.operation!==undefined&&!TOOL_OPERATIONS.includes(value.tool.operation))errors.push(`${path}.tool.operation is invalid`);
  }
  if(!isObject(value.target))errors.push(`${path}.target must be an object`);else{
    approvalAllowedKeys(value.target,['resource','scope','sensitivity'],`${path}.target`,errors);approvalRequiredKeys(value.target,['resource','scope','sensitivity'],`${path}.target`,errors);
    approvalString(value.target.resource,`${path}.target.resource`,errors,512,{nullable:true});approvalString(value.target.scope,`${path}.target.scope`,errors,128,{nullable:true});approvalString(value.target.sensitivity,`${path}.target.sensitivity`,errors,64,{nullable:true});
    if(value.target.sensitivity!==null&&value.target.sensitivity!==undefined&&!SENSITIVITY_LEVELS.includes(value.target.sensitivity))errors.push(`${path}.target.sensitivity is invalid`);
  }
}
function validateApprovalAction(value,path,errors){
  if(!isObject(value)){errors.push(`${path} must be an object`);return;}
  approvalAllowedKeys(value,['type','target','metadata'],path,errors);approvalString(value.type,`${path}.type`,errors,256,{required:true});approvalString(value.target,`${path}.target`,errors,512,{required:true});
  if(!isObject(value.metadata))errors.push(`${path}.metadata must be an object`);else{approvalAllowedKeys(value.metadata,['canonical_action','canonical_resource'],`${path}.metadata`,errors);approvalString(value.metadata.canonical_action,`${path}.metadata.canonical_action`,errors,256,{nullable:true});approvalString(value.metadata.canonical_resource,`${path}.metadata.canonical_resource`,errors,512,{nullable:true});}
}
function validateApprovalClassification(value,path,errors){
  if(!isObject(value)){errors.push(`${path} must be an object`);return;}
  approvalAllowedKeys(value,['risk','data_flow','side_effect','detected_secrets','detected_prompt_injection'],path,errors);
  if(!RISK_LEVELS.includes(value.risk))errors.push(`${path}.risk is invalid`);if(!DATA_FLOWS.includes(value.data_flow))errors.push(`${path}.data_flow is invalid`);if(!SIDE_EFFECTS.includes(value.side_effect))errors.push(`${path}.side_effect is invalid`);if(typeof value.detected_secrets!=='boolean')errors.push(`${path}.detected_secrets must be a boolean`);if(typeof value.detected_prompt_injection!=='boolean')errors.push(`${path}.detected_prompt_injection must be a boolean`);
}
export function validateApprovalRequest(request){
  const errors=[];if(!isObject(request))errors.push('approval request must be an object');
  if(isObject(request)){
    approvalAllowedKeys(request,['approval_request_version','approval_id','request_decision_id','request_digest','issuer','audience','provider_id','requested_at','not_before','expires_at','one_time','request_nonce','action_digest','policy_digest','principal_id','risk','call_id','session_id','summary','canonical_action','canonical_resource','decision_key','decision_channel','reason','classification','normalized_call','action'],'approval request',errors);
    if(!APPROVAL_REQUEST_VERSIONS.includes(request.approval_request_version))errors.push('approval_request_version must be 1.0');
    for(const field of ['approval_id','request_decision_id','request_nonce','principal_id'])approvalString(request[field],field,errors,256,{required:true});
    for(const field of ['issuer','audience','provider_id'])approvalString(request[field],field,errors,128,{required:true});
    for(const field of ['requested_at','not_before','expires_at'])approvalString(request[field],field,errors,64,{required:true});
    validateDigestField(request.action_digest,'action_digest',errors);validateDigestField(request.policy_digest,'policy_digest',errors);validateDigestField(request.request_digest,'request_digest',errors);
    if(request.one_time!==true)errors.push('one_time must be true');
    const requested=validateIsoField(request.requested_at,'requested_at',errors),nb=validateIsoField(request.not_before,'not_before',errors),ex=validateIsoField(request.expires_at,'expires_at',errors);
    if(Number.isFinite(requested)&&Number.isFinite(nb)&&nb<requested)errors.push('not_before must not precede requested_at');if(Number.isFinite(nb)&&Number.isFinite(ex)&&ex<=nb)errors.push('expires_at must be after not_before');
    if(request.risk!==undefined&&!RISK_LEVELS.includes(request.risk))errors.push('risk is invalid');
    approvalString(request.call_id,'call_id',errors,256,{nullable:true});approvalString(request.session_id,'session_id',errors,256,{nullable:true});approvalString(request.summary,'summary',errors,512);approvalString(request.canonical_action,'canonical_action',errors,256,{nullable:true});approvalString(request.canonical_resource,'canonical_resource',errors,512,{nullable:true});approvalString(request.decision_key,'decision_key',errors,128);approvalString(request.decision_channel,'decision_channel',errors,128);approvalString(request.reason,'reason',errors,512);
    if(request.normalized_call!==undefined)validateApprovalNormalizedCall(request.normalized_call,'normalized_call',errors);if(request.action!==undefined)validateApprovalAction(request.action,'action',errors);if(request.classification!==undefined)validateApprovalClassification(request.classification,'classification',errors);
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}
export function validateApprovalResult(result){
  const errors=[];if(!isObject(result))errors.push('approval result must be an object');
  if(isObject(result)){
    approvalAllowedKeys(result,['approval_result_version','approval_result_id','approval_id','request_decision_id','request_digest','result_digest','action_digest','policy_digest','principal_id','provider_id','provider_name','approver','decision','decision_scope','reason','decided_at','not_before','expires_at','one_time','result_nonce','signature'],'approval result',errors);
    if(!APPROVAL_RESULT_VERSIONS.includes(result.approval_result_version))errors.push('approval_result_version must be 1.0');
    for(const field of ['approval_result_id','approval_id','request_decision_id','result_nonce','principal_id'])approvalString(result[field],field,errors,256,{required:true});approvalString(result.provider_id,'provider_id',errors,128,{required:true});
    for(const field of ['decided_at','not_before','expires_at'])approvalString(result[field],field,errors,64,{required:true});
    validateDigestField(result.action_digest,'action_digest',errors);validateDigestField(result.policy_digest,'policy_digest',errors);validateDigestField(result.request_digest,'request_digest',errors);validateDigestField(result.result_digest,'result_digest',errors);
    if(!APPROVAL_RESULT_DECISIONS.includes(result.decision))errors.push('decision must be allow or deny');if(result.one_time!==true)errors.push('one_time must be true');
    const decided=validateIsoField(result.decided_at,'decided_at',errors),nb=validateIsoField(result.not_before,'not_before',errors),ex=validateIsoField(result.expires_at,'expires_at',errors);
    if(Number.isFinite(decided)&&Number.isFinite(nb)&&nb<decided)errors.push('not_before must not precede decided_at');if(Number.isFinite(nb)&&Number.isFinite(ex)&&ex<=nb)errors.push('expires_at must be after not_before');
    validateApprovalPrincipal(result.approver,'approver',errors);
    approvalString(result.provider_name,'provider_name',errors,128);approvalString(result.reason,'reason',errors,512);approvalString(result.decision_scope,'decision_scope',errors,64);approvalString(result.signature,'signature',errors,128);if(result.signature!==undefined&&!/^hmac-sha256:[0-9a-f]{64}$/.test(result.signature))errors.push('signature must be hmac-sha256:<64 hex> when present');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export function validateDecisionReceipt(receipt) {
  const errors = [];
  if (!isObject(receipt)) errors.push('decision receipt must be an object');
  if (isObject(receipt)) {
    if (!['1.0', '1.1', '1.2'].includes(receipt.receipt_version)) errors.push('receipt_version must be 1.0, 1.1, or 1.2');
    for (const field of ['decision_id', 'evaluated_at', 'expires_at', 'action_digest', 'policy_digest', 'decision', 'risk']) {
      if (typeof receipt[field] !== 'string' || receipt[field].length === 0) errors.push(`${field} is required`);
    }
    if (receipt.receipt_version === '1.1' || receipt.receipt_version === '1.2') {
      for (const field of ['nonce', 'issuer', 'audience', 'not_before']) {
        if (typeof receipt[field] !== 'string' || receipt[field].length === 0) errors.push(`${field} is required for receipt_version 1.1`);
      }
      if (receipt.one_time !== true) errors.push('one_time must be true for receipt_version 1.1+');
    }
    if (receipt.receipt_version === '1.2') {
      for (const field of ['approval_id','approval_result_id','approval_request_decision_id','approval_provider_id']) if (typeof receipt[field] !== 'string' || !receipt[field]) errors.push(`${field} is required for receipt_version 1.2`);
    }
    if (receipt.decision !== undefined && !CANONICAL_DECISIONS.includes(normalizeDecisionAction(receipt.decision))) errors.push('decision is invalid');
    if (receipt.risk !== undefined && !RISK_LEVELS.includes(receipt.risk)) errors.push('risk is invalid');
    if (receipt.signature !== undefined && typeof receipt.signature !== 'string') errors.push('signature must be a string when present');
    for (const field of ['authority_grant_id', 'authority_envelope_id', 'principal_id', 'canonical_action', 'canonical_resource', 'intent_id', 'task_id']) {
      if (receipt[field] !== undefined && receipt[field] !== null && typeof receipt[field] !== 'string') errors.push(`${field} must be a string when present`);
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function validateEvidenceEvent(event) {
  const errors = [];
  if (!isObject(event)) errors.push('event must be an object');
  if (isObject(event)) {
    if (!Number.isInteger(event.index) || event.index < 1) errors.push('event.index must be a positive integer');
    if (typeof event.timestamp !== 'string') errors.push('event.timestamp is required');
    if (event.schema_version !== undefined && typeof event.schema_version !== 'string') errors.push('event.schema_version must be a string when present');
    if (event.event_id !== undefined && typeof event.event_id !== 'string') errors.push('event.event_id must be a string when present');
    const action = validateActionEnvelope(event.action);
    if (!action.valid) errors.push(...action.errors.map(e => `event.action.${e}`));
    if (!isObject(event.decision) || !DECISIONS.includes(event.decision.action)) errors.push('event.decision.action is invalid');
    if (typeof event.previousHash !== 'string') errors.push('event.previousHash is required');
    if (typeof event.hash !== 'string') errors.push('event.hash is required');
    if (event.decision?.receipt !== undefined) {
      const receipt = validateDecisionReceipt(event.decision.receipt);
      if (!receipt.valid) errors.push(...receipt.errors.map(error => `event.decision.receipt.${error}`));
    }
    if (event.effect_receipt !== undefined) {
      const effect = validateEffectReceipt(event.effect_receipt);
      if (!effect.valid) errors.push(...effect.errors.map(error => `event.effect_receipt.${error}`));
    }
    if (event.event_type !== undefined && typeof event.event_type !== 'string') errors.push('event.event_type must be a string when present');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function loadJsonLines(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid JSONL line ${i + 1}: ${error.message}`); }
  });
}

export function validateAuthorizationApiResponse(value) {
  const errors = [];
  if (!isObject(value)) errors.push('authorization API response must be an object');
  if (isObject(value)) {
    if (value.api_version !== '1.0') errors.push('api_version must be 1.0');
    if (!isObject(value.decision)) errors.push('decision is required');
    else {
      if (!CANONICAL_DECISIONS.includes(normalizeDecisionAction(value.decision.action))) errors.push('decision.action is invalid');
      if (typeof value.decision.reason !== 'string') errors.push('decision.reason is required');
    }
    if (value.approval !== undefined && value.approval !== null) {
      if (!isObject(value.approval)) errors.push('approval must be an object or null');
      else if (typeof value.approval.approval_id !== 'string') errors.push('approval.approval_id is required');
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function validateAuthorizationApiError(value) {
  const errors = [];
  if (!isObject(value) || !isObject(value.error)) errors.push('error object is required');
  else {
    if (typeof value.error.code !== 'string' || value.error.code.length === 0) errors.push('error.code is required');
    if (typeof value.error.message !== 'string' || value.error.message.length === 0) errors.push('error.message is required');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}


export const CAPABILITY_IDENTITY_VERSIONS = ['1.0'];
export const CAPABILITY_EVIDENCE_VERSIONS = ['1.0'];
export const CAPABILITY_EVIDENCE_CLASSES = ['registry_metadata','declared_manifest','runtime_discovery','local_package_evidence','inferred_classification','operator_annotation','historical_observation'];
export const CAPABILITY_IDENTITY_BASES = ['explicit','package-identifier','source-anchor','name-transport'];
export const CAPABILITY_OBSERVATION_VERSIONS = ['1.0'];
export const CAPABILITY_LIFECYCLE_STATES = ['first_seen','present','removed','reintroduced'];
export const CAPABILITY_DRIFT_CATEGORIES = ['metadata_change','schema_change','capability_expansion','capability_contraction','consequence_escalation','consequence_reduction','provenance_change','transport_change','classification_basis_change'];
const SHA256_ID = /^sha256:[a-f0-9]{64}$/;
function validIsoOrNull(value){return value===null||(typeof value==='string'&&Number.isFinite(Date.parse(value)));}
export function validateCapabilityIdentity(identity) {
  const errors=[];
  if(!isObject(identity)) errors.push('capability identity must be an object');
  if(isObject(identity)) {
    if(!CAPABILITY_IDENTITY_VERSIONS.includes(identity.identity_version)) errors.push('identity_version must be 1.0');
    if(typeof identity.integration_id!=='string'||!SHA256_ID.test(identity.integration_id)) errors.push('integration_id must be a sha256 digest');
    if(typeof identity.capability_id!=='string'||!SHA256_ID.test(identity.capability_id)) errors.push('capability_id must be a sha256 digest');
    if(typeof identity.integration_name!=='string'||!identity.integration_name) errors.push('integration_name is required');
    if(typeof identity.action_name!=='string'||!identity.action_name) errors.push('action_name is required');
    if(typeof identity.transport!=='string'||!identity.transport) errors.push('transport is required');
    if(!CAPABILITY_IDENTITY_BASES.includes(identity.identity_basis)) errors.push('identity_basis is invalid');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}
export function validateCapabilityEvidence(evidence) {
  const errors=[];
  if(!isObject(evidence)) errors.push('capability evidence must be an object');
  if(isObject(evidence)) {
    if(!CAPABILITY_EVIDENCE_VERSIONS.includes(evidence.evidence_version)) errors.push('evidence_version must be 1.0');
    if(typeof evidence.evidence_id!=='string'||!SHA256_ID.test(evidence.evidence_id)) errors.push('evidence_id must be a sha256 digest');
    if(!Array.isArray(evidence.evidence_classes)||evidence.evidence_classes.length===0) errors.push('evidence_classes must be a non-empty array');
    else {const seen=new Set();for(const value of evidence.evidence_classes){if(!CAPABILITY_EVIDENCE_CLASSES.includes(value))errors.push(`evidence_classes contains invalid class: ${value}`);if(seen.has(value))errors.push(`evidence_classes contains duplicate class: ${value}`);seen.add(value);}}
    if(!validIsoOrNull(evidence.observed_at)) errors.push('observed_at must be an ISO date-time or null');
    if(!isObject(evidence.source)) errors.push('source is required');
    else {
      if(typeof evidence.source.source_kind!=='string'||!evidence.source.source_kind) errors.push('source.source_kind is required');
      for(const f of ['source_digest','declared_version','protocol_version']) if(evidence.source[f]!==null&&evidence.source[f]!==undefined&&typeof evidence.source[f]!=='string') errors.push(`source.${f} must be a string or null`);
    }
    if(typeof evidence.mutability!=='string'||!evidence.mutability) errors.push('mutability is required');
    if(!isObject(evidence.classification_basis)) errors.push('classification_basis is required');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export function validateCapabilityObservation(observation) {
  const errors=[];
  if(!isObject(observation)) errors.push('capability observation must be an object');
  if(isObject(observation)) {
    if(!CAPABILITY_OBSERVATION_VERSIONS.includes(observation.observation_version)) errors.push('observation_version must be 1.0');
    for(const f of ['observation_id','integration_id','capability_id']) if(typeof observation[f]!=='string'||!SHA256_ID.test(observation[f])) errors.push(`${f} must be a sha256 digest`);
    if(typeof observation.integration_name!=='string'||!observation.integration_name||observation.integration_name.length>256) errors.push('integration_name is required and must be <= 256 characters');
    if(typeof observation.action_name!=='string'||!observation.action_name||observation.action_name.length>256) errors.push('action_name is required and must be <= 256 characters');
    if(typeof observation.observed_at!=='string'||!Number.isFinite(Date.parse(observation.observed_at))) errors.push('observed_at must be an ISO date-time');
    if(!CAPABILITY_LIFECYCLE_STATES.includes(observation.lifecycle_state)) errors.push('lifecycle_state is invalid');
    if(!Array.isArray(observation.drift_categories)) errors.push('drift_categories must be an array');
    else {const seen=new Set();for(const value of observation.drift_categories){if(!CAPABILITY_DRIFT_CATEGORIES.includes(value))errors.push(`drift_categories contains invalid category: ${value}`);if(seen.has(value))errors.push(`drift_categories contains duplicate category: ${value}`);seen.add(value);}}
    if(observation.previous_observation_id!==null&&observation.previous_observation_id!==undefined&&(typeof observation.previous_observation_id!=='string'||!SHA256_ID.test(observation.previous_observation_id))) errors.push('previous_observation_id must be a sha256 digest or null');
    if(!isObject(observation.snapshot)) errors.push('snapshot is required');
    else {
      if(!['read_only','state_changing','unknown','removed'].includes(observation.snapshot.state)) errors.push('snapshot.state is invalid');
      if(!['read_only','high_consequence','destructive','unknown','removed'].includes(observation.snapshot.consequence)) errors.push('snapshot.consequence is invalid');
      if(typeof observation.snapshot.secret_or_identity_related!=='boolean') errors.push('snapshot.secret_or_identity_related must be boolean');
      if(observation.snapshot.schema_digest!==null&&(typeof observation.snapshot.schema_digest!=='string'||!observation.snapshot.schema_digest.startsWith('sha256:'))) errors.push('snapshot.schema_digest must be a sha256 digest or null');
      if(!isObject(observation.snapshot.classification_basis)) errors.push('snapshot.classification_basis is required');
      if(typeof observation.snapshot.transport!=='string'||!observation.snapshot.transport) errors.push('snapshot.transport is required');
      const ev=validateCapabilityEvidence(observation.snapshot.evidence);for(const e of ev.errors)errors.push(`snapshot.evidence: ${e}`);
      if(isObject(observation.snapshot.evidence)){if(observation.snapshot.evidence.observed_at!==observation.observed_at)errors.push('snapshot.evidence.observed_at must equal observed_at');if(!Array.isArray(observation.snapshot.evidence.evidence_classes)||!observation.snapshot.evidence.evidence_classes.includes('historical_observation'))errors.push('snapshot.evidence must include historical_observation evidence class');}
      if(observation.lifecycle_state==='removed'&&(observation.snapshot.state!=='removed'||observation.snapshot.consequence!=='removed')) errors.push('removed observation must use removed state/consequence');
    }
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export const CAPABILITY_MANIFEST_VERSIONS = ['1.0', '1.1', '1.2'];
export function validateCapabilityManifest(manifest) {
  const errors=[];
  if(!isObject(manifest)) errors.push('capability manifest must be an object');
  if(isObject(manifest)) {
    if(!CAPABILITY_MANIFEST_VERSIONS.includes(manifest.manifest_version)) errors.push('manifest_version must be 1.0, 1.1, or 1.2');
    if(!isObject(manifest.identity)||typeof manifest.identity.name!=='string'||!manifest.identity.name) errors.push('identity.name is required');
    if(!Array.isArray(manifest.tools)) errors.push('tools must be an array');
    else manifest.tools.forEach((tool,index)=>{const path=`tools[${index}]`;if(!isObject(tool)) errors.push(`${path} must be an object`);else{if(typeof tool.name!=='string'||!tool.name)errors.push(`${path}.name is required`);if(!['read_only','state_changing','unknown'].includes(tool.state))errors.push(`${path}.state is invalid`);if(!['read_only','high_consequence','destructive','unknown'].includes(tool.consequence))errors.push(`${path}.consequence is invalid`);if(typeof tool.schema_digest!=='string'||!tool.schema_digest.startsWith('sha256:'))errors.push(`${path}.schema_digest is required`);}});
    if(!isObject(manifest.summary)) errors.push('summary is required');
    if(typeof manifest.fingerprint!=='string'||!manifest.fingerprint.startsWith('sha256:')) errors.push('fingerprint is required');
    if(['1.1','1.2'].includes(manifest.manifest_version)) {
      if(!isObject(manifest.provenance)) errors.push(`provenance is required for manifest_version ${manifest.manifest_version}`);
      else {
        if(typeof manifest.provenance.source_kind!=='string'||!manifest.provenance.source_kind) errors.push('provenance.source_kind is required');
        if(typeof manifest.provenance.mutability!=='string'||!manifest.provenance.mutability) errors.push('provenance.mutability is required');
      }
    }
    if(manifest.manifest_version==='1.2') {
      if(typeof manifest.identity.integration_id!=='string'||!SHA256_ID.test(manifest.identity.integration_id)) errors.push('identity.integration_id is required for manifest_version 1.2');
      if(!CAPABILITY_IDENTITY_BASES.includes(manifest.identity.identity_basis)) errors.push('identity.identity_basis is invalid for manifest_version 1.2');
      if(Array.isArray(manifest.tools)) manifest.tools.forEach((tool,index)=>{
        const path=`tools[${index}]`;
        if(typeof tool.capability_id!=='string'||!SHA256_ID.test(tool.capability_id)) errors.push(`${path}.capability_id is required for manifest_version 1.2`);
        const idValidation=validateCapabilityIdentity(tool.capability_identity);for(const e of idValidation.errors)errors.push(`${path}.capability_identity: ${e}`);
        const evidenceValidation=validateCapabilityEvidence(tool.evidence);for(const e of evidenceValidation.errors)errors.push(`${path}.evidence: ${e}`);
        if(tool.capability_identity?.capability_id!==tool.capability_id) errors.push(`${path}.capability_id must match capability_identity.capability_id`);
        if(tool.capability_identity?.integration_id!==manifest.identity.integration_id) errors.push(`${path}.capability_identity.integration_id must match identity.integration_id`);
      });
    }
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}


function allowedObjectKeys(value, allowed, path, errors) {
  for (const key of Object.keys(value || {})) if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed`);
}

export function validateAdapterDescriptor(descriptor) {
  const errors = [];
  if (!isObject(descriptor)) errors.push('adapter descriptor must be an object');
  else {
    allowedObjectKeys(descriptor, ['contract_version','adapter_id','mode','observation_qualities','observation_capabilities'], 'adapter', errors);
    if (!ADAPTER_CONTRACT_VERSIONS.includes(descriptor.contract_version)) errors.push('contract_version must be 1.0 or 1.1');
    if (typeof descriptor.adapter_id !== 'string' || !descriptor.adapter_id) errors.push('adapter_id is required');
    if (!['normalize','execute'].includes(descriptor.mode)) errors.push('mode must be normalize or execute');
    if (descriptor.contract_version === '1.0') {
      if (!Array.isArray(descriptor.observation_qualities) || !descriptor.observation_qualities.length) errors.push('observation_qualities must be a non-empty array');
      else for (const quality of descriptor.observation_qualities) if (!LEGACY_OBSERVATION_QUALITIES.includes(quality)) errors.push(`unsupported legacy observation quality: ${quality}`);
    }
    if (descriptor.contract_version === '1.1') {
      if (!Array.isArray(descriptor.observation_capabilities) || !descriptor.observation_capabilities.length) errors.push('observation_capabilities must be a non-empty array');
      else {
        const seen = new Set();
        for (const [index, capability] of descriptor.observation_capabilities.entries()) {
          const path = `observation_capabilities[${index}]`;
          if (!isObject(capability)) { errors.push(`${path} must be an object`); continue; }
          allowedObjectKeys(capability, ['quality','boundary','statuses'], path, errors);
          if (!OBSERVATION_QUALITIES.includes(capability.quality)) errors.push(`${path}.quality is invalid`);
          if (typeof capability.boundary !== 'string' || !capability.boundary || capability.boundary.length > 128 || !/^[a-z0-9][a-z0-9._:-]*$/.test(capability.boundary)) errors.push(`${path}.boundary must be a bounded machine-readable token`);
          if (!Array.isArray(capability.statuses) || !capability.statuses.length || capability.statuses.some(status => !['success','failure','partial','unknown'].includes(status))) errors.push(`${path}.statuses must be a non-empty array of effect statuses`);
          if (capability.quality === 'requested_only' && Array.isArray(capability.statuses) && capability.statuses.some(status => status !== 'unknown')) errors.push(`${path} requested_only may declare only unknown status`);
          if (capability.quality === 'ambiguous' && Array.isArray(capability.statuses) && capability.statuses.some(status => status !== 'unknown')) errors.push(`${path} ambiguous may declare only unknown status`);
          if (capability.quality === 'partial' && Array.isArray(capability.statuses) && capability.statuses.some(status => !['partial','unknown'].includes(status))) errors.push(`${path} partial may declare only partial or unknown status`);
          if (descriptor.mode === 'normalize' && capability.quality !== 'requested_only') errors.push(`${path} normalize-mode adapters may declare only requested_only observation`);
          if (seen.has(capability.quality)) errors.push(`${path}.quality duplicates an earlier observation capability`); else seen.add(capability.quality);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function validateRevocationRecord(record) {
  const errors = [];
  if (!isObject(record)) errors.push('revocation record must be an object');
  else {
    allowedObjectKeys(record, ['revocation_version','revocation_id','sequence','subject_type','subject_id','revoked_at','reason','cascade','parent_id','record_digest'], 'revocation', errors);
    if (!REVOCATION_RECORD_VERSIONS.includes(record.revocation_version)) errors.push('revocation_version must be 1.0 or 1.1');
    if (typeof record.revocation_id !== 'string' || !record.revocation_id) errors.push('revocation_id is required');
    if (!REVOCATION_SUBJECT_TYPES.includes(record.subject_type)) errors.push('subject_type is invalid');
    if (typeof record.subject_id !== 'string' || !record.subject_id) errors.push('subject_id is required');
    if (!Number.isFinite(Date.parse(String(record.revoked_at || '')))) errors.push('revoked_at is invalid');
    if (typeof record.reason !== 'string') errors.push('reason must be a string');
    if (typeof record.cascade !== 'boolean') errors.push('cascade must be boolean');
    if (record.parent_id !== null && record.parent_id !== undefined && typeof record.parent_id !== 'string') errors.push('parent_id must be a string or null');
    if (record.revocation_version === '1.1') {
      if (!Number.isInteger(record.sequence) || record.sequence < 1) errors.push('sequence must be a positive integer');
      if (typeof record.record_digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(record.record_digest)) errors.push('record_digest must be a sha256 digest');
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export const EXTENSION_SPI_VERSIONS = ['1.0'];
export const EXTENSION_KINDS = ['organization_policy','approval','event_sink','inspector_intelligence','crashlab_scenario'];
export const EXTENSION_DATA_CLASSES = ['normalized_actions','authority_metadata','effect_metadata','capability_metadata','scenario_metadata'];
export function validateExtensionDescriptor(descriptor) {
  const errors=[];
  if(!isObject(descriptor)) errors.push('extension descriptor must be an object');
  if(isObject(descriptor)) {
    if(!EXTENSION_SPI_VERSIONS.includes(descriptor.spi_version)) errors.push('spi_version must be 1.0');
    if(typeof descriptor.extension_id!=='string'||!descriptor.extension_id) errors.push('extension_id is required');
    if(!EXTENSION_KINDS.includes(descriptor.kind)) errors.push('kind is invalid');
    if(!Array.isArray(descriptor.data_access)) errors.push('data_access must be an array');
    else for(const item of descriptor.data_access) if(!EXTENSION_DATA_CLASSES.includes(item)) errors.push(`data_access contains invalid class: ${item}`);
    if(!['none','optional','required'].includes(descriptor.network)) errors.push('network is invalid');
    if(descriptor.description!==undefined&&typeof descriptor.description!=='string') errors.push('description must be a string when present');
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

export const AUTHORITY_GRAPH_VERSIONS = ['1.0'];
export const AUTHORITY_GRAPH_NODE_KINDS = ['principal','grant','envelope','decision','approval','lease','effect'];
export function validateAuthorityGraph(graph) {
  const errors=[];
  if(!isObject(graph))errors.push('authority graph must be an object');
  if(isObject(graph)){
    if(!AUTHORITY_GRAPH_VERSIONS.includes(graph.graph_version))errors.push('graph_version must be 1.0');
    if(typeof graph.graph_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(graph.graph_id))errors.push('graph_id must be a sha256 digest');
    if(graph.generated_at!==null&&graph.generated_at!==undefined&&(typeof graph.generated_at!=='string'||!Number.isFinite(Date.parse(graph.generated_at))))errors.push('generated_at must be an ISO date-time or null');
    if(!Array.isArray(graph.nodes))errors.push('nodes must be an array');
    else{
      const ids=new Set();
      for(const [i,node] of graph.nodes.entries()){
        if(!isObject(node)){errors.push(`nodes[${i}] must be an object`);continue;}
        if(typeof node.node_id!=='string'||!node.node_id||node.node_id.length>512)errors.push(`nodes[${i}].node_id is invalid`);
        if(ids.has(node.node_id))errors.push(`nodes[${i}].node_id is duplicate`);ids.add(node.node_id);
        if(!AUTHORITY_GRAPH_NODE_KINDS.includes(node.kind))errors.push(`nodes[${i}].kind is invalid`);
        if(typeof node.ref_id!=='string'||!node.ref_id||node.ref_id.length>256)errors.push(`nodes[${i}].ref_id is invalid`);
        if(!isObject(node.data))errors.push(`nodes[${i}].data must be an object`);
      }
    }
    if(!Array.isArray(graph.edges))errors.push('edges must be an array');
    else{
      const edgeIds=new Set(),nodeIds=new Set(Array.isArray(graph.nodes)?graph.nodes.map(n=>n?.node_id):[]);
      for(const [i,edge] of graph.edges.entries()){
        if(!isObject(edge)){errors.push(`edges[${i}] must be an object`);continue;}
        if(typeof edge.edge_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(edge.edge_id))errors.push(`edges[${i}].edge_id must be a sha256 digest`);
        if(edgeIds.has(edge.edge_id))errors.push(`edges[${i}].edge_id is duplicate`);edgeIds.add(edge.edge_id);
        if(typeof edge.from!=='string'||!nodeIds.has(edge.from))errors.push(`edges[${i}].from must reference an existing node`);
        if(typeof edge.to!=='string'||!nodeIds.has(edge.to))errors.push(`edges[${i}].to must reference an existing node`);
        if(typeof edge.relation!=='string'||!edge.relation||edge.relation.length>128)errors.push(`edges[${i}].relation is invalid`);
      }
    }
    if(!Array.isArray(graph.unresolved_references))errors.push('unresolved_references must be an array');
    else for(const [i,ref] of graph.unresolved_references.entries()){
      if(!isObject(ref)){errors.push(`unresolved_references[${i}] must be an object`);continue;}
      if(typeof ref.source_node_id!=='string'||!ref.source_node_id)errors.push(`unresolved_references[${i}].source_node_id is invalid`);else if(Array.isArray(graph.nodes)&&!graph.nodes.some(n=>n?.node_id===ref.source_node_id))errors.push(`unresolved_references[${i}].source_node_id must reference an existing node`);
      if(typeof ref.relation!=='string'||!ref.relation)errors.push(`unresolved_references[${i}].relation is invalid`);
      if(!AUTHORITY_GRAPH_NODE_KINDS.includes(ref.target_kind))errors.push(`unresolved_references[${i}].target_kind is invalid`);
      if(typeof ref.target_ref_id!=='string'||!ref.target_ref_id||ref.target_ref_id.length>256)errors.push(`unresolved_references[${i}].target_ref_id is invalid`);
    }
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}


export const EVIDENCE_GRAPH_VERSIONS = ['1.0'];
export const EVIDENCE_GRAPH_NODE_KINDS = ['principal','grant','envelope','decision','approval','lease','adapter','effect','recorder_event'];
export function validateEvidenceGraph(graph) {
  const errors=[];
  if(!isObject(graph))errors.push('evidence graph must be an object');
  if(isObject(graph)){
    if(!EVIDENCE_GRAPH_VERSIONS.includes(graph.evidence_graph_version))errors.push('evidence_graph_version must be 1.0');
    if(typeof graph.graph_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(graph.graph_id))errors.push('graph_id must be a sha256 digest');
    if(graph.generated_at!==null&&graph.generated_at!==undefined&&(typeof graph.generated_at!=='string'||!Number.isFinite(Date.parse(graph.generated_at))))errors.push('generated_at must be an ISO date-time or null');
    if(!isObject(graph.source))errors.push('source must be an object');
    else{
      if(typeof graph.source.authority_graph_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(graph.source.authority_graph_id))errors.push('source.authority_graph_id must be a sha256 digest');
      if(!Number.isInteger(graph.source.evidence_event_count)||graph.source.evidence_event_count<0)errors.push('source.evidence_event_count must be a non-negative integer');
      if(typeof graph.source.evidence_chain_final_hash!=='string'||!(graph.source.evidence_chain_final_hash==='GENESIS'||/^[a-f0-9]{64}$/.test(graph.source.evidence_chain_final_hash)))errors.push('source.evidence_chain_final_hash is invalid');
      if(graph.source.evidence_verified!==true)errors.push('source.evidence_verified must be true');
    }
    if(!Array.isArray(graph.nodes))errors.push('nodes must be an array');
    else{
      const ids=new Set();
      for(const [i,node] of graph.nodes.entries()){
        if(!isObject(node)){errors.push(`nodes[${i}] must be an object`);continue;}
        if(typeof node.node_id!=='string'||!node.node_id||node.node_id.length>512)errors.push(`nodes[${i}].node_id is invalid`);
        if(ids.has(node.node_id))errors.push(`nodes[${i}].node_id is duplicate`);ids.add(node.node_id);
        if(!EVIDENCE_GRAPH_NODE_KINDS.includes(node.kind))errors.push(`nodes[${i}].kind is invalid`);
        if(typeof node.ref_id!=='string'||!node.ref_id||node.ref_id.length>256)errors.push(`nodes[${i}].ref_id is invalid`);
        if(node.occurred_at!==null&&node.occurred_at!==undefined&&(typeof node.occurred_at!=='string'||!Number.isFinite(Date.parse(node.occurred_at))))errors.push(`nodes[${i}].occurred_at must be an ISO date-time or null`);
        if(!isObject(node.data))errors.push(`nodes[${i}].data must be an object`);
      }
    }
    if(!Array.isArray(graph.edges))errors.push('edges must be an array');
    else{
      const edgeIds=new Set(),nodeIds=new Set(Array.isArray(graph.nodes)?graph.nodes.map(n=>n?.node_id):[]);
      for(const [i,edge] of graph.edges.entries()){
        if(!isObject(edge)){errors.push(`edges[${i}] must be an object`);continue;}
        if(typeof edge.edge_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(edge.edge_id))errors.push(`edges[${i}].edge_id must be a sha256 digest`);
        if(edgeIds.has(edge.edge_id))errors.push(`edges[${i}].edge_id is duplicate`);edgeIds.add(edge.edge_id);
        if(typeof edge.from!=='string'||!nodeIds.has(edge.from))errors.push(`edges[${i}].from must reference an existing node`);
        if(typeof edge.to!=='string'||!nodeIds.has(edge.to))errors.push(`edges[${i}].to must reference an existing node`);
        if(typeof edge.relation!=='string'||!edge.relation||edge.relation.length>128)errors.push(`edges[${i}].relation is invalid`);
      }
    }
    if(!Array.isArray(graph.unresolved_references))errors.push('unresolved_references must be an array');
    else for(const [i,ref] of graph.unresolved_references.entries()){
      if(!isObject(ref)){errors.push(`unresolved_references[${i}] must be an object`);continue;}
      if(typeof ref.source_node_id!=='string'||!ref.source_node_id)errors.push(`unresolved_references[${i}].source_node_id is invalid`);
      else if(Array.isArray(graph.nodes)&&!graph.nodes.some(n=>n?.node_id===ref.source_node_id))errors.push(`unresolved_references[${i}].source_node_id must reference an existing node`);
      if(typeof ref.relation!=='string'||!ref.relation||ref.relation.length>128)errors.push(`unresolved_references[${i}].relation is invalid`);
      if(!EVIDENCE_GRAPH_NODE_KINDS.includes(ref.target_kind))errors.push(`unresolved_references[${i}].target_kind is invalid`);
      if(typeof ref.target_ref_id!=='string'||!ref.target_ref_id||ref.target_ref_id.length>256)errors.push(`unresolved_references[${i}].target_ref_id is invalid`);
    }
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}


export function validateEvidenceBundleManifest(manifest) {
  const errors=[];
  if(!isObject(manifest)) errors.push('evidence bundle manifest must be an object');
  if(isObject(manifest)) {
    if(!EVIDENCE_BUNDLE_VERSIONS.includes(manifest.bundle_version)) errors.push('bundle_version must be 3.0');
    if(typeof manifest.bundle_id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(manifest.bundle_id)) errors.push('bundle_id must be a sha256 digest');
    if(typeof manifest.created_at!=='string'||!Number.isFinite(Date.parse(manifest.created_at))) errors.push('created_at must be an ISO date-time');
    if(!EVIDENCE_PRIVACY_PROFILES.includes(manifest.privacy_profile)) errors.push('privacy_profile is invalid');
    if(!isObject(manifest.source)) errors.push('source must be an object');
    else {
      if(typeof manifest.source.evidence_sha256!=='string'||!/^sha256:[a-f0-9]{64}$/.test(manifest.source.evidence_sha256)) errors.push('source.evidence_sha256 must be a sha256 digest');
      if(!Number.isInteger(manifest.source.event_count)||manifest.source.event_count<0) errors.push('source.event_count must be a non-negative integer');
      if(typeof manifest.source.final_hash!=='string'||!(manifest.source.final_hash==='GENESIS'||/^[a-f0-9]{64}$/.test(manifest.source.final_hash))) errors.push('source.final_hash is invalid');
      for(const k of ['first_event_at','last_event_at']) if(manifest.source[k]!==null&&(typeof manifest.source[k]!=='string'||!Number.isFinite(Date.parse(manifest.source[k])))) errors.push(`source.${k} must be an ISO date-time or null`);
      if(manifest.source.chain_verified_at_export!==true) errors.push('source.chain_verified_at_export must be true');
      if(typeof manifest.source.raw_evidence_included!=='boolean') errors.push('source.raw_evidence_included must be boolean');
    }
    if(!isObject(manifest.graphs)) errors.push('graphs must be an object');
    else for(const k of ['authority_graph_id','evidence_graph_id']) if(typeof manifest.graphs[k]!=='string'||!/^sha256:[a-f0-9]{64}$/.test(manifest.graphs[k])) errors.push(`graphs.${k} must be a sha256 digest`);
    if(!Array.isArray(manifest.adapters)) errors.push('adapters must be an array');
    else {const ids=new Set();for(const [i,a] of manifest.adapters.entries()){if(!isObject(a)){errors.push(`adapters[${i}] must be an object`);continue;}if(typeof a.adapter_id!=='string'||!a.adapter_id||a.adapter_id.length>128)errors.push(`adapters[${i}].adapter_id is invalid`);if(ids.has(a.adapter_id))errors.push(`adapters[${i}].adapter_id is duplicate`);ids.add(a.adapter_id);if(a.adapter_contract_version!==null&&a.adapter_contract_version!==undefined&&(typeof a.adapter_contract_version!=='string'||a.adapter_contract_version.length>32))errors.push(`adapters[${i}].adapter_contract_version is invalid`);}}
    if(!Array.isArray(manifest.files)||manifest.files.length===0) errors.push('files must be a non-empty array');
    else {const paths=new Set();for(const [i,f] of manifest.files.entries()){if(!isObject(f)){errors.push(`files[${i}] must be an object`);continue;}if(typeof f.path!=='string'||!f.path||f.path.startsWith('/')||f.path.includes('\\')||f.path.split('/').some(x=>x===''||x==='.'||x==='..'))errors.push(`files[${i}].path is unsafe`);if(paths.has(f.path))errors.push(`files[${i}].path is duplicate`);paths.add(f.path);if(!Number.isInteger(f.size)||f.size<0)errors.push(`files[${i}].size must be a non-negative integer`);if(typeof f.sha256!=='string'||!/^sha256:[a-f0-9]{64}$/.test(f.sha256))errors.push(`files[${i}].sha256 must be a sha256 digest`);if(!EVIDENCE_BUNDLE_FILE_ROLES.includes(f.role))errors.push(`files[${i}].role is invalid`);}}
    if(!isObject(manifest.verification)) errors.push('verification must be an object');
    else {if(!['reverify_from_bundle','verified_at_export_only'].includes(manifest.verification.source_chain))errors.push('verification.source_chain is invalid');if(!['reverify_from_bundle','verified_at_export_only'].includes(manifest.verification.graphs))errors.push('verification.graphs is invalid');if(!Array.isArray(manifest.verification.instructions)||manifest.verification.instructions.some(x=>typeof x!=='string'||!x))errors.push('verification.instructions must be an array of strings');}
    if(!isObject(manifest.privacy)) errors.push('privacy must be an object');
    else {for(const k of ['includes_raw_evidence','includes_policy','includes_workspace_state','includes_approval_state','includes_session_state'])if(typeof manifest.privacy[k]!=='boolean')errors.push(`privacy.${k} must be boolean`);}
    if(manifest.signature!==undefined){if(!isObject(manifest.signature))errors.push('signature must be an object');else{if(manifest.signature.algorithm!=='hmac-sha256')errors.push('signature.algorithm must be hmac-sha256');if(typeof manifest.signature.key_hint!=='string'||!manifest.signature.key_hint)errors.push('signature.key_hint is required');if(typeof manifest.signature.value!=='string'||!/^hmac-sha256:[a-f0-9]{64}$/.test(manifest.signature.value))errors.push('signature.value is invalid');}}
  }
  return {valid:errors.length===0,errors,isValid:errors.length===0,errorMessage:errors.join('; ')};
}

// CrashLab Scenario Contract v2.0 — formal reliability taxonomy.
export const CRASHLAB_SCENARIO_VERSIONS = ['1.0','1.1','2.0','2.1'];
export const CRASHLAB_FAILURE_PHASES = ['before_authorization','after_authorization_before_effect','before_effect','after_effect_before_response','partial_effect','before_response'];
export const CRASHLAB_FAILURE_CLASSES = ['timeout','response_loss','token_expiry','revocation_race','concurrent_race','stale_capability','stale_policy','stale_approved_baseline','eventual_consistency','transport_failure','local_process_crash','duplicate_retry','synthetic_error'];
export const CRASHLAB_FAILURE_CLASS_PHASES = Object.freeze({
  timeout:[...CRASHLAB_FAILURE_PHASES],
  response_loss:['after_effect_before_response','before_response'],
  token_expiry:['before_authorization','after_authorization_before_effect','before_effect'],
  revocation_race:['after_authorization_before_effect','before_effect'],
  concurrent_race:['before_effect','after_effect_before_response','partial_effect'],
  stale_capability:['before_authorization','after_authorization_before_effect','before_effect'],
  stale_policy:['before_authorization','after_authorization_before_effect','before_effect'],
  stale_approved_baseline:['before_authorization','after_authorization_before_effect','before_effect'],
  eventual_consistency:['after_effect_before_response','before_response'],
  transport_failure:['before_effect','after_effect_before_response','before_response'],
  local_process_crash:[...CRASHLAB_FAILURE_PHASES],
  duplicate_retry:['after_effect_before_response','before_response'],
  synthetic_error:[...CRASHLAB_FAILURE_PHASES]
});
export const CRASHLAB_RETRY_STRATEGIES = ['none','immediate'];
export const CRASHLAB_IDEMPOTENCY_MODES = ['none','supported','required'];
export const CRASHLAB_AUTHORITY_STATES = ['valid','denied','revoked'];
export const CRASHLAB_AUTHORITY_EXPECTATIONS = ['allow','deny','deny_after_revoke','unchanged','one_winner'];
export const CRASHLAB_AMBIGUITY_EXPECTATIONS = ['none','preserve'];
export const CRASHLAB_EXPECTED_EVIDENCE_QUALITIES = ['none_observed',...OBSERVATION_QUALITIES];
export const CRASHLAB_INVARIANTS = ['duplicate_effect_resistance','retry_boundedness','authority_containment','revocation_compliance','ambiguity_preservation','evidence_completeness','recovery_correctness','one_use_authority','stale_state_rejection','eventual_consistency_handling'];
export const RELIABILITY_SCORECARD_VERSIONS = ['1.0'];
export const RELIABILITY_SCORECARD_DIMENSIONS = ['duplicate_effect_resistance','revocation_compliance','ambiguity_handling','retry_boundedness','evidence_completeness','recovery_correctness'];
export const RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS = Object.freeze({
  duplicate_effect_resistance:'duplicate_effect_resistance',
  retry_boundedness:'retry_boundedness',
  authority_containment:'recovery_correctness',
  revocation_compliance:'revocation_compliance',
  ambiguity_preservation:'ambiguity_handling',
  evidence_completeness:'evidence_completeness',
  recovery_correctness:'recovery_correctness',
  one_use_authority:'duplicate_effect_resistance',
  stale_state_rejection:'recovery_correctness',
  eventual_consistency_handling:'ambiguity_handling'
});

function crashlabAllowedKeys(value, allowed, path, errors){for(const key of Object.keys(value||{}))if(!allowed.has(key))errors.push(`${path}.${key} is not allowed`);}
function crashlabString(value,path,errors,{max=256,pattern=null}={}){if(typeof value!=='string'||!value||value.length>max)errors.push(`${path} must be a non-empty string no longer than ${max}`);else if(pattern&&!pattern.test(value))errors.push(`${path} has invalid format`);}
function crashlabPositiveInt(value,path,errors){if(!Number.isInteger(value)||value<1)errors.push(`${path} must be a positive integer`);}

export function validateCrashLabScenario(scenario){
  const errors=[];
  if(!isObject(scenario)) return {valid:false,isValid:false,errors:['CrashLab scenario must be an object'],errorMessage:'CrashLab scenario must be an object'};
  if(!CRASHLAB_SCENARIO_VERSIONS.includes(scenario.scenario_version))errors.push('scenario_version must be 1.0, 1.1, 2.0, or 2.1');
  if(!['2.0','2.1'].includes(scenario.scenario_version)){
    if(typeof scenario.name!=='string'||!scenario.name)errors.push('name is required');
    if(!isObject(scenario.target)||typeof scenario.target.action!=='string'||!scenario.target.action)errors.push('target.action is required');
    if(!isObject(scenario.fault)||!CRASHLAB_FAILURE_PHASES.includes(scenario.fault.point))errors.push('fault.point is invalid');
    if(!isObject(scenario.fault)||typeof scenario.fault.type!=='string'||!scenario.fault.type)errors.push('fault.type is required');
    if(scenario.authority?.revoke_on_attempt!==undefined&&(!Number.isInteger(scenario.authority.revoke_on_attempt)||scenario.authority.revoke_on_attempt<1))errors.push('authority.revoke_on_attempt must be a positive integer');
    return {valid:errors.length===0,isValid:errors.length===0,errors,errorMessage:errors.join('; ')};
  }

  const isV21=scenario.scenario_version==='2.1';
  crashlabAllowedKeys(scenario,new Set(isV21?['scenario_version','scenario_id','name','target','authority','fault','retry','expect','concurrency','state']:['scenario_version','scenario_id','name','target','authority','fault','retry','expect']),'scenario',errors);
  crashlabString(scenario.scenario_id,'scenario_id',errors,{max:128,pattern:/^[a-z0-9][a-z0-9._-]*$/});
  crashlabString(scenario.name,'name',errors,{max:200});

  if(!isObject(scenario.target))errors.push('target must be an object');
  else{
    crashlabAllowedKeys(scenario.target,new Set(['adapter_id','domain','action','resource','idempotency','idempotency_key']),'target',errors);
    crashlabString(scenario.target.adapter_id,'target.adapter_id',errors,{max:128});
    crashlabString(scenario.target.domain,'target.domain',errors,{max:128});
    crashlabString(scenario.target.action,'target.action',errors,{max:256});
    if(scenario.target.resource!==undefined)crashlabString(scenario.target.resource,'target.resource',errors,{max:1024});
    if(!CRASHLAB_IDEMPOTENCY_MODES.includes(scenario.target.idempotency))errors.push('target.idempotency is invalid');
    if(scenario.target.idempotency_key!==undefined&&scenario.target.idempotency_key!==null)crashlabString(scenario.target.idempotency_key,'target.idempotency_key',errors,{max:256});
    if(scenario.target.idempotency==='required'&&typeof scenario.target.idempotency_key!=='string')errors.push('target.idempotency_key is required when idempotency is required');
    if(scenario.target.idempotency==='none'&&scenario.target.idempotency_key!==undefined&&scenario.target.idempotency_key!==null)errors.push('target.idempotency_key must be absent when idempotency is none');
  }

  if(!isObject(scenario.authority))errors.push('authority must be an object');
  else{
    crashlabAllowedKeys(scenario.authority,new Set(['initial_state','revoke_on_attempt']),'authority',errors);
    if(!CRASHLAB_AUTHORITY_STATES.includes(scenario.authority.initial_state))errors.push('authority.initial_state is invalid');
    if(scenario.authority.revoke_on_attempt!==undefined)crashlabPositiveInt(scenario.authority.revoke_on_attempt,'authority.revoke_on_attempt',errors);
  }

  if(!isObject(scenario.fault))errors.push('fault must be an object');
  else{
    crashlabAllowedKeys(scenario.fault,new Set(['phase','class','on_attempt','repeat']),'fault',errors);
    if(!CRASHLAB_FAILURE_PHASES.includes(scenario.fault.phase))errors.push('fault.phase is invalid');
    if(!CRASHLAB_FAILURE_CLASSES.includes(scenario.fault.class))errors.push('fault.class is invalid');
    else if(CRASHLAB_FAILURE_CLASS_PHASES[scenario.fault.class]&&!CRASHLAB_FAILURE_CLASS_PHASES[scenario.fault.class].includes(scenario.fault.phase))errors.push(`fault.class ${scenario.fault.class} is incompatible with phase ${scenario.fault.phase}`);
    crashlabPositiveInt(scenario.fault.on_attempt,'fault.on_attempt',errors);
    if(!['once','every_attempt'].includes(scenario.fault.repeat))errors.push('fault.repeat is invalid');
  }

  if(!isObject(scenario.retry))errors.push('retry must be an object');
  else{
    crashlabAllowedKeys(scenario.retry,new Set(['max_attempts','strategy','preserve_idempotency_key']),'retry',errors);
    crashlabPositiveInt(scenario.retry.max_attempts,'retry.max_attempts',errors);
    if(!CRASHLAB_RETRY_STRATEGIES.includes(scenario.retry.strategy))errors.push('retry.strategy is invalid');
    if(typeof scenario.retry.preserve_idempotency_key!=='boolean')errors.push('retry.preserve_idempotency_key must be boolean');
    if(scenario.retry.strategy==='none'&&scenario.retry.max_attempts!==1)errors.push('retry.max_attempts must be 1 when retry.strategy is none');
    if(Number.isInteger(scenario.fault?.on_attempt)&&Number.isInteger(scenario.retry.max_attempts)&&scenario.fault.on_attempt>scenario.retry.max_attempts)errors.push('fault.on_attempt must be reachable within retry.max_attempts');
    if(scenario.target?.idempotency==='required'&&scenario.retry.preserve_idempotency_key!==true)errors.push('retry.preserve_idempotency_key must be true when target.idempotency is required');
  }

  if(!isObject(scenario.expect))errors.push('expect must be an object');
  else{
    crashlabAllowedKeys(scenario.expect,new Set(['effect_count','authority_behavior','evidence','invariants']),'expect',errors);
    if(!isObject(scenario.expect.effect_count))errors.push('expect.effect_count must be an object');
    else{
      crashlabAllowedKeys(scenario.expect.effect_count,new Set(['min','max']),'expect.effect_count',errors);
      if(!Number.isInteger(scenario.expect.effect_count.min)||scenario.expect.effect_count.min<0)errors.push('expect.effect_count.min must be a non-negative integer');
      if(!Number.isInteger(scenario.expect.effect_count.max)||scenario.expect.effect_count.max<0)errors.push('expect.effect_count.max must be a non-negative integer');
      if(Number.isInteger(scenario.expect.effect_count.min)&&Number.isInteger(scenario.expect.effect_count.max)&&scenario.expect.effect_count.min>scenario.expect.effect_count.max)errors.push('expect.effect_count.min must not exceed max');
    }
    if(!CRASHLAB_AUTHORITY_EXPECTATIONS.includes(scenario.expect.authority_behavior))errors.push('expect.authority_behavior is invalid');
    if(scenario.expect.authority_behavior==='allow'&&['denied','revoked'].includes(scenario.authority?.initial_state))errors.push('expect.authority_behavior allow is incompatible with denied/revoked initial authority');
    if(scenario.expect.authority_behavior==='deny_after_revoke'){if(!Number.isInteger(scenario.authority?.revoke_on_attempt))errors.push('authority.revoke_on_attempt is required for deny_after_revoke');else if(Number.isInteger(scenario.retry?.max_attempts)&&scenario.authority.revoke_on_attempt>scenario.retry.max_attempts)errors.push('authority.revoke_on_attempt must be reachable within retry.max_attempts for deny_after_revoke');}
    if(!isObject(scenario.expect.evidence))errors.push('expect.evidence must be an object');
    else{
      crashlabAllowedKeys(scenario.expect.evidence,new Set(['quality','status','ambiguity']),'expect.evidence',errors);
      if(!CRASHLAB_EXPECTED_EVIDENCE_QUALITIES.includes(scenario.expect.evidence.quality))errors.push('expect.evidence.quality is invalid');
      if(!['none','success','failure','partial','unknown'].includes(scenario.expect.evidence.status))errors.push('expect.evidence.status is invalid');
      if(!CRASHLAB_AMBIGUITY_EXPECTATIONS.includes(scenario.expect.evidence.ambiguity))errors.push('expect.evidence.ambiguity is invalid');
      if(scenario.expect.evidence.quality==='none_observed'&&scenario.expect.evidence.status!=='none')errors.push('expect.evidence.status must be none when quality is none_observed');
      if(['requested_only','ambiguous'].includes(scenario.expect.evidence.quality)&&scenario.expect.evidence.status!=='unknown')errors.push(`expect.evidence.status must be unknown for ${scenario.expect.evidence.quality}`);
    }
    if(!Array.isArray(scenario.expect.invariants)||scenario.expect.invariants.length===0)errors.push('expect.invariants must be a non-empty array');
    else{
      const seen=new Set();
      for(const invariant of scenario.expect.invariants){if(!CRASHLAB_INVARIANTS.includes(invariant))errors.push(`expect.invariants contains invalid invariant: ${invariant}`);if(seen.has(invariant))errors.push(`expect.invariants contains duplicate invariant: ${invariant}`);seen.add(invariant);}
      if(!isV21&&scenario.expect.invariants.some(x=>['one_use_authority','stale_state_rejection','eventual_consistency_handling'].includes(x)))errors.push('concurrency/staleness reliability invariants require scenario_version 2.1');
    }
    if(!isV21&&scenario.expect.authority_behavior==='one_winner')errors.push('expect.authority_behavior one_winner requires scenario_version 2.1');
  }

  if(isV21){
    const sha=/^sha256:[a-f0-9]{64}$/;
    const validatePair=(value,path)=>{if(!isObject(value)){errors.push(`${path} must be an object`);return;}crashlabAllowedKeys(value,new Set(['expected','current']),path,errors);if(typeof value.expected!=='string'||!sha.test(value.expected))errors.push(`${path}.expected must be a sha256 digest`);if(typeof value.current!=='string'||!sha.test(value.current))errors.push(`${path}.current must be a sha256 digest`);if(value.expected===value.current)errors.push(`${path} must describe a stale mismatch`);};
    if(scenario.concurrency!==undefined){
      if(!isObject(scenario.concurrency))errors.push('concurrency must be an object');
      else{crashlabAllowedKeys(scenario.concurrency,new Set(['actors','schedule','shared_authority']),'concurrency',errors);if(!Number.isInteger(scenario.concurrency.actors)||scenario.concurrency.actors<2||scenario.concurrency.actors>16)errors.push('concurrency.actors must be an integer from 2 to 16');if(scenario.concurrency.schedule!=='deterministic_barrier')errors.push('concurrency.schedule must be deterministic_barrier');if(!['one_use','revocable'].includes(scenario.concurrency.shared_authority))errors.push('concurrency.shared_authority is invalid');}
    }
    if(scenario.state!==undefined){
      if(!isObject(scenario.state))errors.push('state must be an object');
      else{crashlabAllowedKeys(scenario.state,new Set(['capability','policy','approved_baseline','consistency']),'state',errors);for(const key of ['capability','policy','approved_baseline'])if(scenario.state[key]!==undefined)validatePair(scenario.state[key],`state.${key}`);if(scenario.state.consistency!==undefined){const c=scenario.state.consistency;if(!isObject(c))errors.push('state.consistency must be an object');else{crashlabAllowedKeys(c,new Set(['visible_on_attempt']),'state.consistency',errors);crashlabPositiveInt(c.visible_on_attempt,'state.consistency.visible_on_attempt',errors);}}}
    }
    const cls=scenario.fault?.class;
    if(cls==='concurrent_race'){if(!isObject(scenario.concurrency))errors.push('concurrency is required for concurrent_race');else if(scenario.concurrency.shared_authority!=='one_use')errors.push('concurrent_race requires concurrency.shared_authority one_use');if(scenario.expect?.authority_behavior!=='one_winner')errors.push('concurrent_race requires expect.authority_behavior one_winner');if(!scenario.expect?.invariants?.includes('one_use_authority'))errors.push('concurrent_race requires one_use_authority invariant');}
    if(cls==='revocation_race'){if(!isObject(scenario.concurrency))errors.push('concurrency is required for revocation_race');else if(scenario.concurrency.shared_authority!=='revocable')errors.push('revocation_race requires concurrency.shared_authority revocable');if(!Number.isInteger(scenario.authority?.revoke_on_attempt))errors.push('revocation_race requires authority.revoke_on_attempt');else if(Number.isInteger(scenario.concurrency?.actors)&&scenario.authority.revoke_on_attempt>scenario.concurrency.actors)errors.push('authority.revoke_on_attempt must be reachable within concurrency.actors');}
    if(cls==='stale_capability'){if(!isObject(scenario.state?.capability))errors.push('stale_capability requires state.capability');if(!scenario.expect?.invariants?.includes('stale_state_rejection'))errors.push('stale_capability requires stale_state_rejection invariant');}
    if(cls==='stale_policy'){if(!isObject(scenario.state?.policy))errors.push('stale_policy requires state.policy');if(!scenario.expect?.invariants?.includes('stale_state_rejection'))errors.push('stale_policy requires stale_state_rejection invariant');}
    if(cls==='stale_approved_baseline'){if(!isObject(scenario.state?.approved_baseline))errors.push('stale_approved_baseline requires state.approved_baseline');if(!scenario.expect?.invariants?.includes('stale_state_rejection'))errors.push('stale_approved_baseline requires stale_state_rejection invariant');}
    if(cls==='eventual_consistency'){const visible=scenario.state?.consistency?.visible_on_attempt;if(!Number.isInteger(visible))errors.push('eventual_consistency requires state.consistency.visible_on_attempt');else{if(visible<=scenario.fault?.on_attempt)errors.push('state.consistency.visible_on_attempt must be later than fault.on_attempt');if(Number.isInteger(scenario.retry?.max_attempts)&&visible>scenario.retry.max_attempts)errors.push('state.consistency.visible_on_attempt must be reachable within retry.max_attempts');}if(scenario.fault?.repeat!=='once')errors.push('eventual_consistency requires fault.repeat once');if(!scenario.expect?.invariants?.includes('eventual_consistency_handling'))errors.push('eventual_consistency requires eventual_consistency_handling invariant');}
  }
  return {valid:errors.length===0,isValid:errors.length===0,errors,errorMessage:errors.join('; ')};
}
