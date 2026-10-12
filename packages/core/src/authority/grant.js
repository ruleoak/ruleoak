/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { posix as pathPosix } from 'node:path';
import { validateAuthorityGrant } from '@ruleoak/protocol';
import { canonicalStringify } from '../decision/receipt.js';
import { normalizeToolCall } from '../permission/normalizer.js';
import { budgetIsWithin, inheritAuthorityBudget, normalizeAuthorityBudget } from './budget.js';
import { mergeAuthorityObligations, normalizeObligations, obligationsAreWithin } from './obligations.js';

const ACTION_MAP = Object.freeze({
  'file.read': 'resource.read',
  'filesystem.read': 'resource.read',
  'file.write': 'resource.write',
  'filesystem.write': 'resource.write',
  'file.create': 'resource.create',
  'filesystem.create': 'resource.create',
  'file.update': 'resource.write',
  'filesystem.update': 'resource.write',
  'file.delete': 'resource.delete',
  'filesystem.delete': 'resource.delete',
  'shell.execute': 'process.execute',
  'shell.run': 'process.execute',
  'email.read': 'communication.message.read',
  'email.send': 'communication.message.send',
  'email.create': 'communication.message.create',
  'email.update': 'communication.message.update',
  'web.read': 'network.read',
  'web.search': 'network.search',
  'web.write': 'network.write',
  'payment.create': 'financial.transaction.create',
  'payment.send': 'financial.transaction.send',
  'payment.update': 'financial.transaction.update',
  'calendar.read': 'calendar.event.read',
  'calendar.create': 'calendar.event.create',
  'calendar.update': 'calendar.event.update',
  'calendar.delete': 'calendar.event.delete',
  'memory.read': 'memory.read',
  'memory.write': 'memory.write',
  'memory.delete': 'memory.delete'
});

function unsignedGrant(grant = {}) {
  const { signature, ...payload } = grant;
  return payload;
}

function safeEqualString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function uniqueSorted(values = []) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.length > 0))].sort();
}

function wildcardToRegExp(pattern) {
  let output = '^';
  for (let i = 0; i < String(pattern).length; i += 1) {
    const char = String(pattern)[i];
    if (char === '*') {
      if (String(pattern)[i + 1] === '*') {
        output += '.*';
        i += 1;
      } else output += '[^/]*';
    } else if (char === '?') output += '.';
    else output += char.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
  }
  return new RegExp(`${output}$`);
}

export function authorityPatternMatches(pattern, value) {
  if (pattern === '*' || pattern === '**') return true;
  return wildcardToRegExp(pattern).test(String(value));
}

function staticPrefix(pattern) {
  const value = String(pattern);
  const index = value.search(/[?*]/);
  return index === -1 ? value : value.slice(0, index);
}

export function authorityPatternIsWithin(childPattern, parentPattern) {
  const child = String(childPattern);
  const parent = String(parentPattern);
  if (parent === '*' || parent === '**' || child === parent) return true;
  if (!/[?*]/.test(child)) return authorityPatternMatches(parent, child);
  if (!/[?*]/.test(parent)) return false;
  if (parent.endsWith('**')) return staticPrefix(child).startsWith(staticPrefix(parent));
  return false;
}

function encodeResourcePart(value) {
  return encodeURIComponent(String(value || '')).replace(/%2F/gi, '/');
}

export function canonicalResourceIdentity(input, options = {}) {
  const call = normalizeToolCall(input, options);
  const raw = String(call.target?.resource || '');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /^urn:/i.test(raw)) return raw;
  const category = call.tool?.category || 'custom';
  let normalized = raw;
  if (category === 'file' || category === 'filesystem') {
    const slashNormalized = raw.replace(/\\/g, '/');
    normalized = pathPosix.normalize(`/${slashNormalized}`).replace(/^\/+/, '');
  }
  return `ruleoak://${encodeURIComponent(category)}/${encodeResourcePart(normalized)}`;
}

export function canonicalActionVocabulary(input, options = {}) {
  const call = normalizeToolCall(input, options);
  const category = call.tool?.category || 'custom';
  const operation = call.tool?.operation || 'execute';
  const key = `${category}.${operation}`;
  return ACTION_MAP[key] || `${category}.${operation}`;
}

function normalizeCapabilities(capabilities = []) {
  return capabilities.map((capability, index) => {
    const actions = uniqueSorted(capability?.actions || (capability?.action ? [capability.action] : []));
    const resources = uniqueSorted(capability?.resources || (capability?.resource ? [capability.resource] : []));
    if (!actions.length) throw new Error(`capabilities[${index}].actions must not be empty`);
    if (!resources.length) throw new Error(`capabilities[${index}].resources must not be empty`);
    return { id: capability?.id || `cap_${index + 1}`, actions, resources };
  });
}

function normalizePrincipal(principal, fallbackType = 'agent') {
  if (typeof principal === 'string') return { type: fallbackType, id: principal };
  return {
    type: principal?.type || fallbackType,
    id: principal?.id || principal?.subject || principal?.name,
    ...(principal?.name ? { name: principal.name } : {}),
    ...(principal?.issuer ? { issuer: principal.issuer } : {})
  };
}

function grantVersionFor(spec={}){
  if(spec.grant_version)return spec.grant_version;
  return spec.delegation!==undefined||spec.budget!==undefined||spec.obligations!==undefined||spec.ancestor_grant_ids!==undefined?'1.1':'1.0';
}
function normalizeDelegationPolicy(spec={},depth=0){
  const allowed=Boolean(spec.allowed);
  const maxDepth=Number.isInteger(spec.max_depth)?spec.max_depth:(allowed?depth+1:depth);
  const budgetMode=spec.budget_mode||'inherit';
  return {allowed,max_depth:maxDepth,budget_mode:budgetMode};
}
function revocationAncestorsForGrant(grant={}){
  const refs=[];
  for(const id of grant.ancestor_grant_ids||[])refs.push({type:'authority_grant',id});
  for(const principal of grant.principal_chain||[])if(principal?.id)refs.push({type:'principal',id:principal.id});
  return refs;
}

export function buildAuthorityGrant(spec = {}, options = {}) {
  const version=grantVersionFor(spec);
  const issuedDate=new Date(options.issuedAt || options.now || spec.issued_at || new Date());
  if(!Number.isFinite(issuedDate.getTime()))throw new Error('authority grant issued_at must be a valid date-time');
  const issuedAt=issuedDate.toISOString();
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(1000, options.ttlMs) : Number.isFinite(spec.ttl_ms) ? Math.max(1000, spec.ttl_ms) : 60 * 60 * 1000;
  const notBeforeDate=new Date(spec.not_before || options.notBefore || issuedAt);if(!Number.isFinite(notBeforeDate.getTime()))throw new Error('authority grant not_before must be a valid date-time');
  const expiresDate=spec.expires_at?new Date(spec.expires_at):new Date(issuedDate.getTime()+ttlMs);if(!Number.isFinite(expiresDate.getTime()))throw new Error('authority grant expires_at must be a valid date-time');
  const notBefore=notBeforeDate.toISOString(),expiresAt=expiresDate.toISOString();
  const subject = normalizePrincipal(spec.subject || options.subject || { type: 'agent', id: 'unknown-agent' });
  if (!subject.id) throw new Error('authority grant subject.id is required');
  const suppliedChain = Array.isArray(spec.principal_chain) ? spec.principal_chain.map(item => normalizePrincipal(item, item?.type || 'agent')) : [];
  const principalChain = suppliedChain.length ? suppliedChain : [subject];
  const depth=Number.isInteger(spec.delegation_depth)?spec.delegation_depth:0;
  const grant = {
    grant_version: version,
    grant_id: spec.grant_id || options.grantId || `grant_${randomUUID()}`,
    issuer: spec.issuer || options.issuer || 'ruleoak',
    subject,
    principal_chain: principalChain,
    capabilities: normalizeCapabilities(spec.capabilities || []),
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    parent_grant_id: spec.parent_grant_id || null,
    delegation_depth: depth,
    ...(spec.task_id ? { task_id: spec.task_id } : {}),
    ...(spec.intent_id ? { intent_id: spec.intent_id } : {}),
    ...(spec.session_id ? { session_id: spec.session_id } : {})
  };
  if(version==='1.1'){
    grant.ancestor_grant_ids=[...(spec.ancestor_grant_ids||[])];
    grant.budget=normalizeAuthorityBudget(spec.budget||{});
    grant.obligations=normalizeObligations(spec.obligations||[]);
    grant.delegation=normalizeDelegationPolicy(spec.delegation||{},depth);
  }
  const validation = validateAuthorityGrant(grant);
  if (!validation.valid) throw new Error(`invalid authority grant: ${validation.errors.join('; ')}`);
  return options.secret ? signAuthorityGrant(grant, options.secret) : grant;
}

export function signAuthorityGrant(grant, secret) {
  if (!secret) throw new Error('authority grant signing secret is required');
  const validation = validateAuthorityGrant(unsignedGrant(grant));
  if (!validation.valid) throw new Error(`invalid authority grant: ${validation.errors.join('; ')}`);
  const signature = `hmac-sha256:${createHmac('sha256', String(secret)).update(canonicalStringify(unsignedGrant(grant))).digest('hex')}`;
  return { ...unsignedGrant(grant), signature };
}

export function verifyAuthorityGrant(grant, options = {}) {
  const validation = validateAuthorityGrant(grant);
  const errors = [...validation.errors];
  const now = new Date(options.now || new Date()).getTime();
  const notBefore = new Date(grant?.not_before || 0).getTime();
  const expiresAt = new Date(grant?.expires_at || 0).getTime();
  if (!Number.isFinite(now)) errors.push('authority grant verification time is invalid');
  if (!Number.isFinite(notBefore) || notBefore > now) errors.push('authority grant is not active yet');
  if (!Number.isFinite(expiresAt) || expiresAt <= now) errors.push('authority grant has expired');
  if (options.expectedSubjectId && grant?.subject?.id !== options.expectedSubjectId) errors.push(`authority grant subject mismatch: expected ${options.expectedSubjectId}`);
  if (options.expectedSessionId && grant?.session_id && grant.session_id !== options.expectedSessionId) errors.push(`authority grant session mismatch: expected ${options.expectedSessionId}`);
  if(options.revocationRegistry&&grant?.grant_id){
    const revoked=options.revocationRegistry.isRevoked('authority_grant',grant.grant_id,{now:options.now,ancestors:revocationAncestorsForGrant(grant),assumeLocked:options.revocationAssumeLocked});
    if(revoked.revoked)errors.push(`authority grant revoked: ${revoked.record.reason}`);
  }
  if (options.requireSignature !== false && !options.secret) errors.push('authority grant verification secret is required');
  if (options.secret) {
    if (!grant?.signature) errors.push('signed authority grant required');
    else {
      const expected = signAuthorityGrant(unsignedGrant(grant), options.secret).signature;
      if (!safeEqualString(grant.signature, expected)) errors.push('authority grant signature mismatch');
    }
  } else if (options.requireSignature !== false && !grant?.signature) errors.push('signed authority grant required');
  return { ok: errors.length === 0, errors, grant };
}

function delegationPolicyIsWithin(parent,child,errors){
  if(parent?.grant_version!=='1.1'||child?.grant_version!=='1.1')return;
  const p=parent.delegation||{},c=child.delegation||{};
  if(!p.allowed)errors.push('parent grant does not allow delegation');
  if((child.delegation_depth??0)>p.max_depth)errors.push('child delegation_depth exceeds parent max_depth');
  if(c.max_depth>p.max_depth)errors.push('child delegation.max_depth exceeds parent max_depth');
  if(p.budget_mode==='partition'&&c.budget_mode!=='partition')errors.push('child delegation budget_mode cannot widen partition to inherit');
}

export function isAuthorityGrantAttenuated(parent, child) {
  const errors = [];
  if (child?.parent_grant_id !== parent?.grant_id) errors.push('child parent_grant_id does not reference parent grant');
  if ((child?.delegation_depth ?? 0) !== (parent?.delegation_depth ?? 0) + 1) errors.push('child delegation_depth must equal parent delegation_depth + 1');
  if(child?.issuer!==parent?.subject?.id)errors.push('child issuer must equal parent subject.id');
  const parentStart = new Date(parent?.not_before || 0).getTime();
  const childStart = new Date(child?.not_before || 0).getTime();
  const parentEnd = new Date(parent?.expires_at || 0).getTime();
  const childEnd = new Date(child?.expires_at || 0).getTime();
  if (childStart < parentStart) errors.push('child authority starts before parent authority');
  if (childEnd > parentEnd) errors.push('child authority expires after parent authority');
  const parentChain = parent?.principal_chain || [];
  const childChain = child?.principal_chain || [];
  if (childChain.length !== parentChain.length + 1) errors.push('child principal_chain must extend parent chain by exactly one principal');
  else {
    for (let i = 0; i < parentChain.length; i += 1) if (canonicalStringify(childChain[i]) !== canonicalStringify(parentChain[i])) errors.push('child principal_chain does not preserve parent chain');
    if (childChain.at(-1)?.id !== child?.subject?.id||childChain.at(-1)?.type!==child?.subject?.type) errors.push('child principal_chain must end with child subject');
  }
  for (const childCapability of child?.capabilities || []) {
    const covered = (parent?.capabilities || []).some(parentCapability =>
      childCapability.actions.every(childAction => parentCapability.actions.some(parentAction => authorityPatternIsWithin(childAction, parentAction)))
      && childCapability.resources.every(childResource => parentCapability.resources.some(parentResource => authorityPatternIsWithin(childResource, parentResource)))
    );
    if (!covered) errors.push(`child capability ${childCapability.id || '<unnamed>'} exceeds parent authority`);
  }
  if(parent?.grant_version==='1.1'){
    if(child?.grant_version!=='1.1')errors.push('Authority Grant v1.1 may delegate only to v1.1 child grants');
    else{
      const expectedAncestors=[...(parent.ancestor_grant_ids||[]),parent.grant_id];if(canonicalStringify(child.ancestor_grant_ids||[])!==canonicalStringify(expectedAncestors))errors.push('child ancestor_grant_ids must extend parent ancestry exactly');
      const budget=budgetIsWithin(child.budget||{},parent.budget||{});errors.push(...budget.errors);
      const obligations=obligationsAreWithin(child.obligations||[],parent.obligations||[]);errors.push(...obligations.errors);
      delegationPolicyIsWithin(parent,child,errors);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function delegateAuthorityGrant(parent, spec = {}, secret, options = {}) {
  const parentVerification = verifyAuthorityGrant(parent, { ...options, secret, requireSignature: options.requireSignature !== false, revocationRegistry:options.revocationRegistry });
  if (!parentVerification.ok) throw new Error(`cannot delegate invalid parent authority: ${parentVerification.errors.join('; ')}`);
  const subject = normalizePrincipal(spec.subject || { type: 'agent', id: 'unknown-agent' });
  if (!subject.id) throw new Error('delegated authority subject.id is required');
  const expiresAt = spec.expires_at || parent.expires_at;
  const issuanceMs=new Date(options.now || new Date()).getTime();
  if(!Number.isFinite(issuanceMs))throw new Error('delegation time must be a valid date-time');
  const requestedStartMs=spec.not_before?new Date(spec.not_before).getTime():NaN;
  if(spec.not_before&&!Number.isFinite(requestedStartMs))throw new Error('delegated authority not_before must be a valid date-time');
  const parentStartMs=new Date(parent.not_before).getTime();
  const childNotBefore=new Date(Math.max(issuanceMs,parentStartMs,Number.isFinite(requestedStartMs)?requestedStartMs:-Infinity)).toISOString();
  const isV11=parent.grant_version==='1.1';
  if(isV11&&parent.delegation?.allowed!==true)throw new Error('parent authority does not allow delegation');
  if(isV11&&(parent.delegation_depth+1)>parent.delegation.max_depth)throw new Error('parent authority delegation max_depth reached');
  const childDepth=(parent.delegation_depth||0)+1;
  let childBudget,childObligations,childDelegation;
  if(isV11){
    childBudget=inheritAuthorityBudget(parent.budget||{},spec.budget||{});
    childObligations=mergeAuthorityObligations(parent.obligations||[],spec.obligations||[]);
    const requested=spec.delegation||{};const requestedAllowed=Boolean(requested.allowed);
    const maxDepth=Number.isInteger(requested.max_depth)?requested.max_depth:(requestedAllowed?parent.delegation.max_depth:childDepth);
    const budgetMode=requested.budget_mode||parent.delegation.budget_mode;
    childDelegation={allowed:requestedAllowed,max_depth:maxDepth,budget_mode:budgetMode};
  }
  const child = buildAuthorityGrant({
    ...spec,
    grant_version:isV11?'1.1':'1.0',
    issuer: parent.subject?.id || parent.issuer,
    subject,
    principal_chain: [...(parent.principal_chain || []), subject],
    parent_grant_id: parent.grant_id,
    delegation_depth: childDepth,
    ...(isV11?{ancestor_grant_ids:[...(parent.ancestor_grant_ids||[]),parent.grant_id],budget:childBudget,obligations:childObligations,delegation:childDelegation}:{}),
    not_before: childNotBefore,
    expires_at: expiresAt,
    task_id: spec.task_id || parent.task_id,
    intent_id: spec.intent_id || parent.intent_id,
    session_id: spec.session_id || parent.session_id
  }, { ...options, secret: undefined });
  const attenuation = isAuthorityGrantAttenuated(parent, child);
  if (!attenuation.ok) throw new Error(`delegated authority exceeds parent: ${attenuation.errors.join('; ')}`);
  const signed=secret ? signAuthorityGrant(child, secret) : child;
  if(isV11&&parent.delegation.budget_mode==='partition'){
    if(!options.budgetRegistry)throw new Error('partition delegation requires a DelegationBudgetRegistry');
    options.budgetRegistry.reserve(parent,signed,{now:options.now});
  }
  return signed;
}

export function authorizeWithAuthorityGrant(grant, input, options = {}) {
  const call = normalizeToolCall(input, options);
  const actorId = call.actor?.id || call.actor?.name;
  const verification = verifyAuthorityGrant(grant, {
    now: options.now,
    secret: options.secret,
    requireSignature: options.requireSignature !== false,
    expectedSubjectId: options.bindSubject === false ? undefined : actorId,
    expectedSessionId: call.actor?.session_id,
    revocationRegistry:options.revocationRegistry,
    revocationAssumeLocked:options.revocationAssumeLocked
  });
  const canonicalAction = canonicalActionVocabulary(call);
  const canonicalResource = canonicalResourceIdentity(call);
  if (!verification.ok) return { ok: false, errors: verification.errors, grant, canonicalAction, canonicalResource, matchedCapability: null };
  const matchedCapability = (grant.capabilities || []).find(capability =>
    capability.actions.some(pattern => authorityPatternMatches(pattern, canonicalAction))
    && capability.resources.some(pattern => authorityPatternMatches(pattern, canonicalResource))
  ) || null;
  const errors = matchedCapability ? [] : [`authority grant does not permit ${canonicalAction} on ${canonicalResource}`];
  return { ok: errors.length === 0, errors, grant, canonicalAction, canonicalResource, matchedCapability };
}
