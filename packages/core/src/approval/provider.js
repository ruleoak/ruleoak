/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { buildApprovalRequest, buildApprovalResult } from './contract.js';

export const APPROVAL_PROVIDER_API_VERSIONS = Object.freeze(['1.0','1.1']);
export const APPROVAL_PROVIDER_API_VERSION = '1.1';
export const APPROVAL_DECISIONS = Object.freeze(['allow_once','deny_once','allow_session','deny_session','always_ask','always_allow','always_block']);
export const APPROVAL_PROVIDER_TIMEOUT_MS = 30_000;
export { buildApprovalRequest } from './contract.js';

function boundedTimeoutMs(value, fallback=APPROVAL_PROVIDER_TIMEOUT_MS){
  if(value===undefined||value===null)return fallback;
  const n=Number(value);if(!Number.isFinite(n)||n<1||n>5*60_000)throw new Error('approval provider timeoutMs must be between 1 and 300000');return Math.floor(n);
}
async function withProviderDeadline(operation,label,timeoutMs){
  let timer;
  try{
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out after ${timeoutMs}ms`)),timeoutMs);})
    ]);
  }finally{if(timer)clearTimeout(timer);}
}

export function validateApprovalProvider(provider){
  const errors=[];
  if(!provider||typeof provider!=='object')errors.push('approval provider must be an object');
  else{
    if(!APPROVAL_PROVIDER_API_VERSIONS.includes(provider.apiVersion))errors.push(`approval provider apiVersion must be one of ${APPROVAL_PROVIDER_API_VERSIONS.join(', ')}`);
    if(typeof provider.name!=='string'||!provider.name)errors.push('approval provider name is required');
    if(provider.apiVersion==='1.1'&&(typeof provider.providerId!=='string'||!provider.providerId))errors.push('approval provider providerId is required for apiVersion 1.1');
    if(typeof provider.request!=='function')errors.push('approval provider request(request, context) function is required');
    if(provider.decide!==undefined&&typeof provider.decide!=='function')errors.push('approval provider decide must be a function when present');
    if(provider.list!==undefined&&typeof provider.list!=='function')errors.push('approval provider list must be a function when present');
  }
  return{valid:errors.length===0,errors};
}

export class ApprovalBroker{
  constructor(provider,options={}){const v=validateApprovalProvider(provider);if(!v.valid)throw new Error(`invalid approval provider: ${v.errors.join('; ')}`);this.provider=provider;this.timeoutMs=boundedTimeoutMs(options.timeoutMs);}
  async request(permissionResult,options={}){const request=buildApprovalRequest(permissionResult,{...options,providerId:options.providerId||this.provider.providerId||this.provider.name,audience:options.audience||`approval-provider:${this.provider.providerId||this.provider.name}`});const timeoutMs=boundedTimeoutMs(options.timeoutMs,this.timeoutMs);const response=await withProviderDeadline(()=>this.provider.request(request,options.context||{}),`approval provider ${this.provider.name} request`,timeoutMs);return{request,response,provider:this.provider.name,providerId:this.provider.providerId||this.provider.name};}
  async decide(approvalId,decision,options={}){if(!APPROVAL_DECISIONS.includes(decision))throw new Error(`unsupported approval decision: ${decision}`);if(typeof this.provider.decide!=='function')throw new Error(`approval provider ${this.provider.name} does not support decide`);const timeoutMs=boundedTimeoutMs(options.timeoutMs,this.timeoutMs);return await withProviderDeadline(()=>this.provider.decide(approvalId,decision,options.context||{}),`approval provider ${this.provider.name} decide`,timeoutMs);}
  async list(options={}){if(typeof this.provider.list!=='function')throw new Error(`approval provider ${this.provider.name} does not support list`);const timeoutMs=boundedTimeoutMs(options.timeoutMs,this.timeoutMs);return await withProviderDeadline(()=>this.provider.list(options.context||{}),`approval provider ${this.provider.name} list`,timeoutMs);}
}

export class MemoryApprovalProvider{
  constructor(options={}){this.apiVersion='1.1';this.name=options.name||'memory';this.providerId=options.providerId||'ruleoak.memory';this.secret=options.secret;this.approver=options.approver||{type:'service',id:this.providerId,name:this.name};this.requests=new Map();}
  request(request){this.requests.set(request.approval_id,{request:structuredClone(request),result:null});return{accepted:true,approval_id:request.approval_id,status:'pending'};}
  list(){return[...this.requests.values()].map(v=>structuredClone(v.result?{...v.request,status:'decided',approval_result:v.result}:{...v.request,status:'pending'}));}
  decide(approvalId,decision,context={}){const entry=this.requests.get(approvalId);if(!entry)throw new Error(`approval not found: ${approvalId}`);if(entry.result)throw new Error(`approval already decided: ${approvalId}`);const result=buildApprovalResult(entry.request,decision,{providerId:this.providerId,providerName:this.name,approver:this.approver,secret:this.secret,decidedAt:context.decidedAt,ttlMs:context.ttlMs,reason:context.reason});entry.result=result;this.requests.set(approvalId,entry);return structuredClone(result);}
}
