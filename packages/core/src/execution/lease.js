/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { durableExclusiveCreateSync, readBoundedFileSync } from '../io/durable-file.js';
import { resolve } from 'node:path';
import { validateExecutionLease } from '@ruleoak/protocol';
import { actionDigest, canonicalStringify, policyDigest } from '../decision/receipt.js';
import { evaluateAuthorityBudget, normalizeAuthorityBudget } from '../authority/budget.js';
import { evaluateObligations, normalizeObligations } from '../authority/obligations.js';
import { verifyApprovalResult, consumeApprovalResultForLease, verifyApprovalUseBinding, loadApprovalUseRecord } from '../approval/contract.js';

function unsigned(value={}) { const { signature, ...rest }=value; return rest; }
function equal(a,b){const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
function time(value,label){const d=new Date(value);if(!Number.isFinite(d.getTime()))throw new Error(`${label} must be a valid date-time`);return d.getTime();}
function unique(values=[]){return [...new Set(values.filter(v=>typeof v==='string'&&v))];}
function minTime(values){const finite=values.filter(Number.isFinite);return finite.length?Math.min(...finite):NaN;}
function maxTime(values){const finite=values.filter(Number.isFinite);return finite.length?Math.max(...finite):NaN;}

export function buildExecutionLease(result, policy = {}, options = {}) {
  if(options.maxUses!==undefined&&options.maxUses!==1)throw new Error('ExecutionLease is one-use; maxUses must be 1 when supplied');
  if (result?.decision?.action !== 'allow') throw new Error('execution lease requires an allow decision');
  const receipt=result.decision.receipt;
  if (!receipt?.decision_id) throw new Error('execution lease requires a decision receipt');
  const issuedMs=time(options.issuedAt || new Date(),'execution lease issuedAt');
  const approvalBound=receipt.receipt_version==='1.2'||Boolean(receipt.approval_result_id);
  if(approvalBound){
    if(!options.approvalRequest||!options.approvalResult)throw new Error('approval-bound execution lease requires ApprovalRequest and ApprovalResult');
    const av=verifyApprovalResult(options.approvalResult,options.approvalRequest,{now:new Date(issuedMs).toISOString(),secret:options.approvalSecret,requireSignature:Boolean(options.requireApprovalSignature),providerId:receipt.approval_provider_id});
    if(!av.ok)throw new Error(`invalid approval binding: ${av.errors.join('; ')}`);
    if(options.approvalResult.decision!=='allow')throw new Error('approval-bound execution lease requires allow ApprovalResult');
    if(receipt.approval_id!==options.approvalRequest.approval_id||receipt.approval_result_id!==options.approvalResult.approval_result_id||receipt.approval_request_decision_id!==options.approvalRequest.request_decision_id)throw new Error('DecisionReceipt approval binding mismatch');
    if(receipt.action_digest!==options.approvalResult.action_digest||receipt.policy_digest!==options.approvalResult.policy_digest)throw new Error('DecisionReceipt approval digest mismatch');
    if(!options.approvalUseStoreDir)throw new Error('approval-bound execution lease requires approvalUseStoreDir');
    const stored=loadApprovalUseRecord(options.approvalResult.approval_result_id,options.approvalUseStoreDir);if(!stored)throw new Error('approval result has not been atomically consumed for lease issuance');
    const uv=verifyApprovalUseBinding(stored.record,options.approvalRequest,options.approvalResult,{leaseId:options.leaseId,leaseNonce:options.nonce});if(!uv.ok)throw new Error(`invalid approval use binding: ${uv.errors.join('; ')}`);
  }
  const ttlMs=Number.isFinite(options.ttlMs) ? Math.max(1000,options.ttlMs) : 5*60*1000;
  const env=result.authority?.envelope || options.authorityEnvelope || null;
  const grant=result.authority?.grant || options.authorityGrant || null;
  if(options.revocationRegistry){
    const issuanceNow=new Date(issuedMs).toISOString();
    const ancestry=[];
    for(const id of grant?.ancestor_grant_ids||[])ancestry.push({type:'authority_grant',id});
    for(const principal of grant?.principal_chain||[])if(principal?.id)ancestry.push({type:'principal',id:principal.id});
    if(grant?.grant_id){const r=options.revocationRegistry.isRevoked('authority_grant',grant.grant_id,{now:issuanceNow,ancestors:ancestry});if(r.revoked)throw new Error(`cannot issue execution lease from revoked authority grant: ${r.record.reason}`);}
    if(env?.envelope_id){const r=options.revocationRegistry.isRevoked('authority_envelope',env.envelope_id,{now:issuanceNow,ancestors:[...ancestry,...(grant?.grant_id?[{type:'authority_grant',id:grant.grant_id}]:[])]});if(r.revoked)throw new Error(`cannot issue execution lease from revoked authority envelope: ${r.record.reason}`);}
  }
  const constraints=env?.constraints || grant?.budget || {};
  const requestedNotBefore=options.notBefore?time(options.notBefore,'execution lease notBefore'):issuedMs;
  const notBeforeMs=maxTime([issuedMs,requestedNotBefore,env?.not_before?time(env.not_before,'authority envelope not_before'):NaN,grant?.not_before?time(grant.not_before,'authority grant not_before'):NaN,receipt?.not_before?time(receipt.not_before,'decision receipt not_before'):NaN]);
  const requestedExpiry=issuedMs+ttlMs;
  const expiresMs=minTime([requestedExpiry,env?.expires_at?time(env.expires_at,'authority envelope expires_at'):NaN,grant?.expires_at?time(grant.expires_at,'authority grant expires_at'):NaN,receipt?.expires_at?time(receipt.expires_at,'decision receipt expires_at'):NaN]);
  if(!Number.isFinite(expiresMs)||expiresMs<=notBeforeMs)throw new Error('execution lease has no positive validity window within parent authority');
  const isV11=grant?.grant_version==='1.1';
  const lease={
    lease_version:approvalBound?'1.2':(isV11?'1.1':'1.0'), lease_id:options.leaseId || `lease_${randomUUID()}`, decision_id:receipt.decision_id,
    principal_id:receipt.principal_id || result.normalizedCall?.actor?.id || result.normalizedCall?.actor?.name || 'unknown-principal',
    authority_envelope_id:env?.envelope_id || null, authority_grant_id:receipt.authority_grant_id || grant?.grant_id || null,
    action_digest:receipt.action_digest || actionDigest(result.normalizedCall || result.action || {}), policy_digest:receipt.policy_digest || policyDigest(policy),
    canonical_action:receipt.canonical_action || result.authority?.canonicalAction || 'custom.execute', canonical_resource:receipt.canonical_resource || result.authority?.canonicalResource || 'ruleoak://custom/unknown',
    issued_at:new Date(issuedMs).toISOString(), not_before:new Date(notBeforeMs).toISOString(), expires_at:new Date(expiresMs).toISOString(),
    max_uses:1,
    ...(approvalBound?{approval_id:receipt.approval_id,approval_result_id:receipt.approval_result_id}:{}),
    budget:normalizeAuthorityBudget(options.budget || constraints), obligations:normalizeObligations(options.obligations || env?.obligations || grant?.obligations || []), nonce:options.nonce || randomUUID(),
    ...((isV11||approvalBound)?{authority_ancestor_grant_ids:unique(grant?.ancestor_grant_ids||[]),authority_principal_ids:unique((grant?.principal_chain||[]).map(p=>p?.id))}:{})
  };
  const validation=validateExecutionLease(lease); if(!validation.valid) throw new Error(`invalid execution lease: ${validation.errors.join('; ')}`);
  return options.secret ? signExecutionLease(lease,options.secret) : lease;
}

export function issueExecutionLease(result,policy={},options={}){
  const receipt=result?.decision?.receipt;
  if(receipt?.receipt_version!=='1.2'&&!receipt?.approval_result_id)return buildExecutionLease(result,policy,options);
  if(!options.approvalRequest||!options.approvalResult)throw new Error('approval-bound lease issuance requires ApprovalRequest and ApprovalResult');
  if(!options.approvalUseStoreDir)throw new Error('approval-bound lease issuance requires approvalUseStoreDir');
  const leaseId=options.leaseId||`lease_${randomUUID()}`;const nonce=options.nonce||randomUUID();
  const use=consumeApprovalResultForLease(options.approvalRequest,options.approvalResult,{storeDir:options.approvalUseStoreDir,leaseId,leaseNonce:nonce,now:options.issuedAt||new Date(),consumedAt:options.issuedAt||new Date(),secret:options.approvalSecret,requireSignature:Boolean(options.requireApprovalSignature),providerId:receipt.approval_provider_id});
  if(!use.ok)throw new Error(`approval result cannot issue lease: ${use.errors.join('; ')}`);
  return buildExecutionLease(result,policy,{...options,leaseId,nonce,approvalUseStoreDir:options.approvalUseStoreDir});
}

export function signExecutionLease(lease,secret){if(!secret)throw new Error('execution lease signing secret is required');const validation=validateExecutionLease(unsigned(lease));if(!validation.valid)throw new Error(`invalid execution lease: ${validation.errors.join('; ')}`);return {...unsigned(lease),signature:`hmac-sha256:${createHmac('sha256',String(secret)).update(canonicalStringify(unsigned(lease))).digest('hex')}`};}

function revocationAncestors(lease={}){
  const refs=[];
  if(lease.authority_envelope_id)refs.push({type:'authority_envelope',id:lease.authority_envelope_id});
  if(lease.authority_grant_id)refs.push({type:'authority_grant',id:lease.authority_grant_id});
  for(const id of lease.authority_ancestor_grant_ids||[])refs.push({type:'authority_grant',id});
  for(const id of lease.authority_principal_ids||[])refs.push({type:'principal',id});
  if(lease.principal_id)refs.push({type:'principal',id:lease.principal_id});
  return refs;
}

export function verifyExecutionLease(lease,input,policy={},options={}){
  const validation=validateExecutionLease(lease);const errors=[...validation.errors];const now=new Date(options.now||new Date()).getTime();
  if(!Number.isFinite(now))errors.push('execution lease verification time is invalid');
  const notBefore=Date.parse(lease?.not_before||''),expires=Date.parse(lease?.expires_at||'');
  if(!Number.isFinite(notBefore)||notBefore>now)errors.push('execution lease is not active yet');if(!Number.isFinite(expires)||expires<=now)errors.push('execution lease has expired');
  if(input&&lease?.action_digest!==actionDigest(input,{sessionId:options.sessionId}))errors.push('execution lease action mismatch');if(policy&&lease?.policy_digest!==policyDigest(policy))errors.push('execution lease policy mismatch');
  if(options.principalId&&lease?.principal_id!==options.principalId)errors.push(`execution lease principal mismatch: expected ${options.principalId}`);
  if(options.authorityEnvelopeId&&lease?.authority_envelope_id!==options.authorityEnvelopeId)errors.push('execution lease authority envelope mismatch');
  if(options.revocationRegistry){const r=options.revocationRegistry.isRevoked('execution_lease',lease?.lease_id,{now:options.now,ancestors:revocationAncestors(lease),assumeLocked:options.revocationAssumeLocked});if(r.revoked)errors.push(`execution lease revoked: ${r.record.reason}`);}
  const budget=evaluateAuthorityBudget(lease?.budget||{},options.usage||{});errors.push(...budget.errors);
  const obligations=evaluateObligations(lease?.obligations||[],options.obligationContext||{},'pre');errors.push(...obligations.errors);
  if(options.requireSignature!==false&&!options.secret)errors.push('execution lease verification secret is required');
  if(options.secret){if(!lease?.signature)errors.push('signed execution lease required');else if(!equal(lease.signature,signExecutionLease(unsigned(lease),options.secret).signature))errors.push('execution lease signature mismatch');}
  return {ok:errors.length===0,errors,lease,budget,obligations};
}

function markerName(lease){return createHash('sha256').update(`${lease.lease_id}:${lease.nonce}:${lease.action_digest}`).digest('hex');}
function consumeUnlocked(lease,input,policy,options){
  const verification=verifyExecutionLease(lease,input,policy,{...options,revocationAssumeLocked:Boolean(options.revocationRegistry)});if(!verification.ok)return {...verification,consumed:false,replayed:false};
  if(!options.storeDir)return {...verification,ok:false,consumed:false,replayed:false,errors:['execution lease storeDir is required for replay protection']};
  const dir=resolve(options.storeDir);mkdirSync(dir,{recursive:true,mode:0o700});const path=resolve(dir,`${markerName(lease)}.json`);
  if(existsSync(path)){let existing=null;try{existing=JSON.parse(readBoundedFileSync(path,{maxBytes:64*1024,label:'execution lease consumption marker'}));}catch{}return {...verification,ok:false,consumed:false,replayed:true,errors:[`execution lease already consumed: ${lease.lease_id}${existing?'':' (marker unreadable)'}`],existing,markerPath:path};}
  const consumedDate=new Date(options.consumedAt||options.now||new Date());if(!Number.isFinite(consumedDate.getTime()))return{...verification,ok:false,consumed:false,replayed:false,errors:['execution lease consumedAt is invalid']};
  const marker={consumption_version:'1.0',lease_id:lease.lease_id,decision_id:lease.decision_id,consumed_at:consumedDate.toISOString(),principal_id:lease.principal_id,action_digest:lease.action_digest,policy_digest:lease.policy_digest,receipt_digest:`sha256:${createHash('sha256').update(canonicalStringify(lease)).digest('hex')}`};
  const created=durableExclusiveCreateSync(path,JSON.stringify(marker,null,2)+'\n',{mode:0o600});if(!created.created)return {...verification,ok:false,consumed:false,replayed:true,errors:[`execution lease already consumed: ${lease.lease_id}`],markerPath:path};
  return {...verification,ok:true,consumed:true,replayed:false,marker,markerPath:path};
}
export function consumeExecutionLease(lease,input,policy={},options={}){
  if(options.revocationRegistry?.withExclusive)return options.revocationRegistry.withExclusive(()=>consumeUnlocked(lease,input,policy,options));
  return consumeUnlocked(lease,input,policy,options);
}
