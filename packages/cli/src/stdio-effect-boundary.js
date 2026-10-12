/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import {
  adapterDescriptor,
  canonicalDigest,
  buildEffectReceipt,
  buildEffectVerificationRecord,
  buildExecutionLease,
  consumeExecutionLease,
  decideEffectRetry,
  EFFECT_VERIFICATION_STATES,
  inferMcpEffectContract,
  validateEffectReceiptAgainstAdapter,
  verifyFilesystemPostcondition
} from '@ruleoak/core';
import { clearInflightEffect, persistEffectState, persistInflightEffect } from './effect-state.js';
import { publicEffectProfile } from './effect-profile.js';

function idKey(id) { return `${typeof id}:${JSON.stringify(id)}`; }
function safeError(error) { return error ? { name:String(error.name||'Error').slice(0,128), message:String(error.message||error).slice(0,2048), code:error.code==null?null:String(error.code).slice(0,128) } : null; }
function sideEffectLikely(action={}) {
  const op=String(action?.metadata?.operation||'').toLowerCase();
  return !['read','get','list','search','query','echo','inspect','describe'].includes(op);
}
function unknownVerification(reason) { return {state:EFFECT_VERIFICATION_STATES.UNKNOWN,reason,evidence:{effect_applied:null,retry_safe:false}}; }
function verifyContract(contract) {
  const spec=contract?.verifier_spec;
  if(spec?.kind==='filesystem') return verifyFilesystemPostcondition(spec,spec);
  return unknownVerification('no safe serializable postcondition contract is available for this stdio MCP tool effect');
}

/**
 * Full execution/effect boundary for local stdio MCP tools. It creates and consumes
 * a one-use lease before forwarding a consequential tools/call, journals an inflight
 * effect before dispatch, correlates the child JSON-RPC response, verifies the local
 * postcondition independently, and never performs an automatic retry.
 */
export class StdioMcpEffectBoundary {
  constructor(options={}) {
    this.policy=options.policy||{};
    this.recorder=options.recorder;
    this.baseDir=resolve(options.baseDir||process.cwd());
    this.executionSecret=options.executionSecret||randomBytes(32).toString('hex');
    this.consumedLeasesDir=resolve(options.consumedLeasesDir||this.baseDir,'.ruleoak','consumed-leases');
    this.executionLeaseTtlMs=Number(options.executionLeaseTtlMs)||30000;
    this.maxEffectHashBytes=Number(options.maxEffectHashBytes)||undefined;
    this.effectProfile=options.effectProfile||null;
    this.pending=new Map();
  }

  async beforeForward({item,inputAction,result,evaluatedAt}) {
    if(!sideEffectLikely(inputAction)) return {allow:true,tracked:false};
    if(item?.id===undefined) return {allow:false,decision:{reason:'consequential MCP tools/call requires a JSON-RPC id so RuleOak can correlate the execution outcome',matchedRule:'effect:stdio-correlation-required'}};
    const key=idKey(item.id);
    if(this.pending.has(key)) return {allow:false,decision:{reason:'another consequential MCP request with the same JSON-RPC id is still unresolved',matchedRule:'effect:stdio-request-id-in-use'}};
    const lease=buildExecutionLease(result,this.policy,{secret:this.executionSecret,issuedAt:evaluatedAt,ttlMs:this.executionLeaseTtlMs});
    const consumption=consumeExecutionLease(lease,inputAction,this.policy,{secret:this.executionSecret,storeDir:this.consumedLeasesDir,now:evaluatedAt,consumedAt:evaluatedAt,executor:'ruleoak-mcp-stdio'});
    if(!consumption.ok) return {allow:false,decision:{reason:(consumption.errors||[]).join('; ')||'execution lease consumption failed',matchedRule:consumption.replayed?'execution-lease:replay-denied':'execution-lease:invalid'}};
    const effectId=`effect_${randomUUID()}`;
    const contract=this.effectProfile?.kind==='local-filesystem'?inferMcpEffectContract(item,{maxHashBytes:this.maxEffectHashBytes,allowedRoots:this.effectProfile.roots}):null;
    const effectProfile=publicEffectProfile(this.effectProfile),verifierSpec=contract?.verifier_spec||null;
    const effectBindingDigest=canonicalDigest({effect_profile:effectProfile,effect_contract:contract,verifier_spec:verifierSpec});
    const entry={key,id:item.id,item,inputAction,result,lease,consumption,effectId,contract,effectProfile,effectBindingDigest,startedAt:evaluatedAt};
    persistInflightEffect(this.baseDir,{effect_id:effectId,adapter:'mcp-stdio-gateway',started_at:evaluatedAt,requested:{method:'tools/call',name:item.params?.name||null,jsonrpc_id:item.id},execution_lease:lease,lease_binding:{lease_id:lease.lease_id,decision_id:lease.decision_id,action_digest:lease.action_digest},effect_profile:effectProfile,effect_contract:contract,verifier_spec:verifierSpec,effect_binding_digest:effectBindingDigest});
    this.pending.set(key,entry);
    this.recorder.append({type:'ruleoak.execution.lease.consume',target:item.params?.name||'',arguments:{},metadata:{lease_id:lease.lease_id,effect_id:effectId,action_digest:lease.action_digest,side_effect:true,transport:'mcp-stdio'}},{action:'allow',reason:'one-use ExecutionLease consumed before stdio MCP dispatch',matchedRule:'execution-lease:consumed'},evaluatedAt,{eventType:'ruleoak.execution.lease.consumed',ledgerPayload:{effect_id:effectId,lease_id:lease.lease_id,effect_profile:effectProfile,effect_contract_available:Boolean(contract),effect_binding_digest:effectBindingDigest}});
    return {allow:true,tracked:true,effect_id:effectId,lease_id:lease.lease_id};
  }

  async observeJson(value) {
    const values=Array.isArray(value)?value:[value];
    for(const response of values) {
      if(!response||typeof response!=='object'||response.id===undefined||(!Object.hasOwn(response,'result')&&!Object.hasOwn(response,'error'))) continue;
      const entry=this.pending.get(idKey(response.id));
      if(!entry) continue;
      await this.#finalize(entry,{responseReceived:true,response,error:null});
    }
  }

  async finalizeUnresolved(error=null) {
    for(const entry of [...this.pending.values()]) await this.#finalize(entry,{responseReceived:false,response:null,error});
  }

  async #finalize(entry,{responseReceived,response,error}) {
    if(!this.pending.has(entry.key)) return null;
    this.pending.delete(entry.key);
    const completedAt=new Date().toISOString();
    const descriptor=adapterDescriptor('mcp-stdio-gateway');
    const receipt=buildEffectReceipt(entry.lease,{status:'unknown',observation_quality:responseReceived?'process_return_observed':'ambiguous',requested:{method:'tools/call',name:entry.item.params?.name||null,jsonrpc_id:entry.id},observed:{response_received:responseReceived,jsonrpc_error:Boolean(response?.error),jsonrpc_error_code:response?.error?.code??null},error:safeError(error)},{effectId:entry.effectId,adapter:'mcp-stdio-gateway',startedAt:entry.startedAt,completedAt,descriptor});
    const validation=validateEffectReceiptAgainstAdapter(receipt,descriptor);
    if(!validation.ok) throw new Error(`stdio MCP EffectReceipt violates adapter contract: ${validation.errors.join('; ')}`);
    this.recorder.append({type:'ruleoak.effect.mcp.stdio',target:entry.item.params?.name||'',arguments:{},metadata:{lease_id:entry.lease.lease_id,effect_id:receipt.effect_id,observation_quality:receipt.observation_quality,observation_boundary:receipt.observation_boundary,side_effect:true}},{action:'allow',reason:responseReceived?'MCP child response observed; business effect requires independent postcondition verification':'MCP child response was not observed; external effect is ambiguous until independently verified',matchedRule:'effect-receipt'},completedAt,{eventType:'ruleoak.effect.mcp.stdio',effectReceipt:receipt});
    const raw=verifyContract(entry.contract);
    const verification=buildEffectVerificationRecord(receipt,raw,{lease:entry.lease,actionDigest:entry.lease.action_digest,verifiedAt:completedAt});
    const retry=decideEffectRetry(receipt,verification,{lease:entry.lease});
    this.recorder.append({type:'ruleoak.effect.mcp.stdio.verify',target:entry.item.params?.name||'',arguments:{},metadata:{lease_id:entry.lease.lease_id,effect_id:receipt.effect_id,action_digest:entry.lease.action_digest,tool:entry.item.params?.name||null,side_effect:true}},{action:'allow',reason:retry.reason,matchedRule:`effect:${retry.disposition}`},completedAt,{eventType:'ruleoak.effect.mcp.stdio.verified',effectReceipt:receipt,ledgerPayload:{effect_verification:verification,retry_decision:retry,effect_contract_version:entry.contract?.effect_contract_version||null,effect_binding_digest:entry.effectBindingDigest}});
    persistEffectState(this.baseDir,{effect_receipt:receipt,effect_verification:verification,retry_decision:retry,execution_lease:entry.lease,lease_binding:{lease_id:entry.lease.lease_id,decision_id:entry.lease.decision_id,action_digest:entry.lease.action_digest},effect_profile:entry.effectProfile,effect_contract:entry.contract||null,verifier_spec:entry.contract?.verifier_spec||null,effect_binding_digest:entry.effectBindingDigest});
    clearInflightEffect(this.baseDir,entry.effectId);
    return {receipt,verification,retry};
  }
}
