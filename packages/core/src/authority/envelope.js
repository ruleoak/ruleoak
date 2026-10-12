/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { validateAuthorityEnvelope } from '@ruleoak/protocol';
import { canonicalStringify, policyDigest } from '../decision/receipt.js';
import { authorityPatternIsWithin, authorityPatternMatches, authorizeWithAuthorityGrant, canonicalActionVocabulary, canonicalResourceIdentity, verifyAuthorityGrant } from './grant.js';
import { normalizeAuthorityBudget, budgetIsWithin, inheritAuthorityBudget } from './budget.js';
import { normalizeObligations, mergeAuthorityObligations, obligationsAreWithin } from './obligations.js';

function unsigned(value = {}) { const { signature, ...rest } = value; return rest; }
function equal(a, b) { const x=Buffer.from(String(a)); const y=Buffer.from(String(b)); return x.length===y.length && timingSafeEqual(x,y); }
function uniq(values=[]) { return [...new Set(values.filter(value => typeof value === 'string' && value.length))].sort(); }
function normalizeCapabilities(capabilities=[]) { return capabilities.map((cap,index)=>({ id: cap.id || `env_cap_${index+1}`, actions: uniq(cap.actions || []), resources: uniq(cap.resources || []) })); }

export function envelopeCapabilitiesAreWithin(capabilities = [], grantCapabilities = []) {
  const errors=[];
  for (const child of capabilities) {
    const covered=grantCapabilities.some(parent => child.actions.every(action => parent.actions.some(pattern => authorityPatternIsWithin(action, pattern))) && child.resources.every(resource => parent.resources.some(pattern => authorityPatternIsWithin(resource, pattern))));
    if (!covered) errors.push(`envelope capability ${child.id || '<unnamed>'} exceeds authority grant`);
  }
  return { ok: errors.length===0, errors };
}

export function buildAuthorityEnvelope(grant, spec = {}, options = {}) {
  if (!grant) throw new Error('authority grant is required');
  const verification=verifyAuthorityGrant(grant,{ now: options.now || spec.issued_at, secret: options.authoritySecret, requireSignature: options.requireAuthoritySignature !== false, revocationRegistry:options.revocationRegistry });
  if (!verification.ok) throw new Error(`cannot build envelope from invalid authority grant: ${verification.errors.join('; ')}`);
  const capabilities=normalizeCapabilities(spec.capabilities || grant.capabilities);
  const within=envelopeCapabilitiesAreWithin(capabilities, grant.capabilities || []);
  if (!within.ok) throw new Error(within.errors.join('; '));
  const parentBudget=normalizeAuthorityBudget(spec.parent_budget || options.parentBudget || (grant.grant_version==='1.1'?grant.budget||{}:{}));
  const requestedBudget=normalizeAuthorityBudget(spec.constraints || {});
  const inheritedBudget=Object.keys(parentBudget).length?inheritAuthorityBudget(parentBudget,requestedBudget):requestedBudget;
  const requestedDelegation=spec.constraints?.delegation_allowed ?? false;
  if(grant.grant_version==='1.1'&&requestedDelegation&&grant.delegation?.allowed!==true)throw new Error('authority envelope cannot allow delegation when parent grant forbids delegation');
  const constraints={ ...inheritedBudget, network: spec.constraints?.network || 'inherit', delegation_allowed: requestedDelegation };
  const budgetCheck=budgetIsWithin(constraints,parentBudget);
  if (Object.keys(parentBudget).length && !budgetCheck.ok) throw new Error(`envelope budget exceeds parent: ${budgetCheck.errors.join('; ')}`);
  const issuedMs=new Date(spec.issued_at || options.issuedAt || options.now || new Date()).getTime();
  if(!Number.isFinite(issuedMs))throw new Error('authority envelope issued_at must be a valid date-time');
  const parentStartMs=new Date(grant.not_before).getTime(), parentEndMs=new Date(grant.expires_at).getTime();
  const requestedStartMs=spec.not_before?new Date(spec.not_before).getTime():NaN;
  if(spec.not_before&&!Number.isFinite(requestedStartMs))throw new Error('authority envelope not_before must be a valid date-time');
  const requestedEndMs=spec.expires_at?new Date(spec.expires_at).getTime():parentEndMs;
  if(!Number.isFinite(requestedEndMs))throw new Error('authority envelope expires_at must be a valid date-time');
  const notBeforeMs=Math.max(issuedMs,parentStartMs,Number.isFinite(requestedStartMs)?requestedStartMs:-Infinity);
  const issuedAt=new Date(issuedMs).toISOString(),notBefore=new Date(notBeforeMs).toISOString(),expiresAt=new Date(requestedEndMs).toISOString();
  if (notBeforeMs < parentStartMs || requestedEndMs > parentEndMs || requestedEndMs <= notBeforeMs) throw new Error('authority envelope temporal bounds exceed authority grant or have no positive validity window');
  const envelope={
    envelope_version:'1.0', envelope_id: spec.envelope_id || `env_${randomUUID()}`, grant_id: grant.grant_id,
    principal_chain: structuredClone(grant.principal_chain), capabilities, issued_at: issuedAt, not_before: notBefore, expires_at: expiresAt,
    constraints, obligations: grant.grant_version==='1.1'?mergeAuthorityObligations(grant.obligations||[],spec.obligations||[]):normalizeObligations(spec.obligations || []),
    ...(grant.intent_id || spec.intent_id ? { intent_id: spec.intent_id || grant.intent_id } : {}),
    ...(grant.task_id || spec.task_id ? { task_id: spec.task_id || grant.task_id } : {}),
    ...(grant.session_id || spec.session_id ? { session_id: spec.session_id || grant.session_id } : {}),
    ...(spec.policy ? { policy_digest: policyDigest(spec.policy) } : spec.policy_digest ? { policy_digest: spec.policy_digest } : {}),
    ...(spec.revocation_ref ? { revocation_ref: spec.revocation_ref } : {}), ...(spec.attestation ? { attestation: structuredClone(spec.attestation) } : {})
  };
  const validation=validateAuthorityEnvelope(envelope); if(!validation.valid) throw new Error(`invalid authority envelope: ${validation.errors.join('; ')}`);
  return options.envelopeSecret ? signAuthorityEnvelope(envelope, options.envelopeSecret) : envelope;
}

export function signAuthorityEnvelope(envelope, secret) {
  if(!secret) throw new Error('authority envelope signing secret is required');
  const validation=validateAuthorityEnvelope(unsigned(envelope)); if(!validation.valid) throw new Error(`invalid authority envelope: ${validation.errors.join('; ')}`);
  return { ...unsigned(envelope), signature:`hmac-sha256:${createHmac('sha256',String(secret)).update(canonicalStringify(unsigned(envelope))).digest('hex')}` };
}

export function verifyAuthorityEnvelope(envelope, options = {}) {
  const validation=validateAuthorityEnvelope(envelope); const errors=[...validation.errors];
  const now=new Date(options.now || new Date()).getTime();
  if (new Date(envelope?.not_before || 0).getTime() > now) errors.push('authority envelope is not active yet');
  if (new Date(envelope?.expires_at || 0).getTime() <= now) errors.push('authority envelope has expired');
  if (options.grant && envelope?.grant_id !== options.grant.grant_id) errors.push('authority envelope grant_id mismatch');
  if (options.grant) {
    const within=envelopeCapabilitiesAreWithin(envelope?.capabilities || [], options.grant.capabilities || []); errors.push(...within.errors);
    if (new Date(envelope?.not_before || 0).getTime() < new Date(options.grant.not_before || 0).getTime()) errors.push('authority envelope starts before grant');
    if (new Date(envelope?.expires_at || 0).getTime() > new Date(options.grant.expires_at || 0).getTime()) errors.push('authority envelope expires after grant');
    if(options.grant.grant_version==='1.1'){
      const budget=budgetIsWithin(envelope?.constraints||{},options.grant.budget||{});errors.push(...budget.errors);
      const obligations=obligationsAreWithin(envelope?.obligations||[],options.grant.obligations||[]);errors.push(...obligations.errors);
      if(envelope?.constraints?.delegation_allowed&&options.grant.delegation?.allowed!==true)errors.push('authority envelope delegation exceeds parent grant');
    }
  }
  if (options.expectedPrincipalId && envelope?.principal_chain?.at(-1)?.id !== options.expectedPrincipalId) errors.push(`authority envelope principal mismatch: expected ${options.expectedPrincipalId}`);
  if (options.expectedSessionId && envelope?.session_id && envelope.session_id !== options.expectedSessionId) errors.push(`authority envelope session mismatch: expected ${options.expectedSessionId}`);
  if (options.revocationRegistry) {
    const ancestorRefs=[...(options.grant?.ancestor_grant_ids||[]).map(id=>({type:'authority_grant',id})),...(options.grant?.principal_chain||[]).filter(p=>p?.id).map(p=>({type:'principal',id:p.id})),...(envelope?.grant_id?[{type:'authority_grant',id:envelope.grant_id}]:[])];
    const revoked=options.revocationRegistry.isRevoked('authority_envelope', envelope?.envelope_id, { now: options.now, ancestors:ancestorRefs, assumeLocked:options.revocationAssumeLocked });
    if (revoked.revoked) errors.push(`authority envelope revoked: ${revoked.record.reason}`);
    const grantRevoked=options.revocationRegistry.isRevoked('authority_grant', envelope?.grant_id, { now: options.now, ancestors:ancestorRefs, assumeLocked:options.revocationAssumeLocked });
    if (grantRevoked.revoked) errors.push(`authority grant revoked: ${grantRevoked.record.reason}`);
  }
  if (options.requireSignature !== false && !options.secret) errors.push('authority envelope verification secret is required');
  if (options.secret) {
    if (!envelope?.signature) errors.push('signed authority envelope required');
    else if (!equal(envelope.signature, signAuthorityEnvelope(unsigned(envelope), options.secret).signature)) errors.push('authority envelope signature mismatch');
  }
  return { ok: errors.length===0, errors, envelope };
}

export function authorizeWithAuthorityEnvelope(envelope, input, options = {}) {
  if (!options.grant) return { ok:false, errors:['authority grant is required to verify an authority envelope'], envelope, grant:null, matchedCapability:null, canonicalAction:canonicalActionVocabulary(input), canonicalResource:canonicalResourceIdentity(input) };
  const grantAuth=authorizeWithAuthorityGrant(options.grant,input,{ now:options.now, secret:options.authoritySecret, requireSignature:options.requireAuthoritySignature !== false, bindSubject:options.bindSubject, revocationRegistry:options.revocationRegistry, revocationAssumeLocked:options.revocationAssumeLocked });
  const principalId=grantAuth.grant?.subject?.id;
  const verification=verifyAuthorityEnvelope(envelope,{ now:options.now, secret:options.envelopeSecret, requireSignature:options.requireEnvelopeSignature !== false, grant:options.grant, revocationRegistry:options.revocationRegistry, revocationAssumeLocked:options.revocationAssumeLocked, expectedPrincipalId: options.bindSubject===false ? undefined : principalId, expectedSessionId: input?.actor?.session_id });
  const errors=[...grantAuth.errors,...verification.errors];
  const canonicalAction=grantAuth.canonicalAction; const canonicalResource=grantAuth.canonicalResource;
  const matchedCapability=(envelope.capabilities || []).find(cap => cap.actions.some(p=>authorityPatternMatches(p,canonicalAction)) && cap.resources.some(p=>authorityPatternMatches(p,canonicalResource))) || null;
  if (!matchedCapability) errors.push(`authority envelope does not permit ${canonicalAction} on ${canonicalResource}`);
  return { ok:errors.length===0, errors:[...new Set(errors)], envelope, grant:options.grant, matchedCapability, canonicalAction, canonicalResource };
}

/**
 * Build an unsigned preview of a bounded authority envelope without persisting it.
 * The preview uses the same attenuation/temporal/budget validation as creation.
 */
export function previewAuthorityEnvelope(grant, spec = {}, options = {}) {
  try {
    const envelope = buildAuthorityEnvelope(grant, spec, { ...options, envelopeSecret: undefined });
    const parentActions = uniq((grant.capabilities || []).flatMap(cap => cap.actions || []));
    const parentResources = uniq((grant.capabilities || []).flatMap(cap => cap.resources || []));
    const requestedActions = uniq((envelope.capabilities || []).flatMap(cap => cap.actions || []));
    const requestedResources = uniq((envelope.capabilities || []).flatMap(cap => cap.resources || []));
    const grantStart = new Date(grant.not_before).getTime();
    const grantEnd = new Date(grant.expires_at).getTime();
    const envStart = new Date(envelope.not_before).getTime();
    const envEnd = new Date(envelope.expires_at).getTime();
    return {
      ok: true,
      errors: [],
      envelope,
      attenuation: {
        action_patterns: { parent: parentActions, requested: requestedActions, removed_count: Math.max(0, parentActions.length - requestedActions.length) },
        resource_patterns: { parent: parentResources, requested: requestedResources, removed_count: Math.max(0, parentResources.length - requestedResources.length) },
        temporal: {
          parent_not_before: grant.not_before,
          parent_expires_at: grant.expires_at,
          requested_not_before: envelope.not_before,
          requested_expires_at: envelope.expires_at,
          narrows_start: envStart >= grantStart,
          narrows_expiry: envEnd <= grantEnd
        },
        constraints: structuredClone(envelope.constraints || {}),
        obligations: structuredClone(envelope.obligations || [])
      }
    };
  } catch (error) {
    return { ok: false, errors: [error.message], envelope: null, attenuation: null };
  }
}
