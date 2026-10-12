/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { ADAPTER_CONTRACT_VERSIONS, validateAdapterDescriptor, validateEffectReceipt, validateNormalizedToolCall } from '@ruleoak/protocol';

export { ADAPTER_CONTRACT_VERSIONS, validateAdapterDescriptor };
export const ADAPTER_CONTRACT_VERSION='1.1';

const cap=(quality,boundary,statuses)=>Object.freeze({quality,boundary,statuses:Object.freeze([...statuses])});
export const BUILTIN_ADAPTER_DESCRIPTORS=Object.freeze({
  'authorization-request':{contract_version:'1.1',adapter_id:'authorization-request',mode:'normalize',observation_capabilities:[cap('requested_only','authorization-request',['unknown'])]},
  'openai-tool-call':{contract_version:'1.1',adapter_id:'openai-tool-call',mode:'normalize',observation_capabilities:[cap('requested_only','openai-tool-request',['unknown'])]},
  'mcp-tools-call':{contract_version:'1.1',adapter_id:'mcp-tools-call',mode:'normalize',observation_capabilities:[cap('requested_only','mcp-tool-request',['unknown'])]},
  'mcp-http-gateway':{contract_version:'1.1',adapter_id:'mcp-http-gateway',mode:'execute',observation_capabilities:[cap('remote_response_observed','mcp-upstream-http-response',['unknown']),cap('ambiguous','mcp-upstream-no-response',['unknown'])]},
  'mcp-stdio-gateway':{contract_version:'1.1',adapter_id:'mcp-stdio-gateway',mode:'execute',observation_capabilities:[cap('process_return_observed','mcp-child-stdio-response',['unknown']),cap('ambiguous','mcp-child-no-response',['unknown'])]},
  'ruleoak-sdk-guard':{contract_version:'1.1',adapter_id:'ruleoak-sdk-guard',mode:'execute',observation_capabilities:[cap('process_return_observed','guarded-function-return',['unknown']),cap('ambiguous','guarded-function-exception',['unknown'])]},
  'shell-command':{contract_version:'1.1',adapter_id:'shell-command',mode:'normalize',observation_capabilities:[cap('requested_only','shell-command-request',['unknown'])]},
  'filesystem-action':{contract_version:'1.1',adapter_id:'filesystem-action',mode:'normalize',observation_capabilities:[cap('requested_only','filesystem-action-request',['unknown'])]},
  'http-action':{contract_version:'1.1',adapter_id:'http-action',mode:'normalize',observation_capabilities:[cap('requested_only','http-action-request',['unknown'])]},
  'git-action':{contract_version:'1.1',adapter_id:'git-action',mode:'execute',observation_capabilities:[
    cap('process_return_observed','git-process-return',['success','failure']),
    cap('local_state_observed','git-local-state',['success','failure','partial','unknown']),
    cap('remote_response_observed','git-remote-response',['success','failure','unknown']),
    cap('complete_for_adapter','git-adapter-complete',['success','failure']),
    cap('partial','git-partial-observation',['partial','unknown']),
    cap('ambiguous','git-ambiguous-effect',['unknown'])
  ]}
});
export function adapterDescriptor(adapterId){const d=BUILTIN_ADAPTER_DESCRIPTORS[adapterId];return d?structuredClone(d):null;}
export function observationCapability(descriptor,quality){if(descriptor?.contract_version!=='1.1')return null;return descriptor.observation_capabilities?.find(c=>c.quality===quality)||null;}
export function annotateAdapterContract(call,adapterId){
  const descriptor=adapterDescriptor(adapterId);if(!descriptor)return call;
  const contract={contract_version:descriptor.contract_version,adapter_id:descriptor.adapter_id,mode:descriptor.mode};
  if(descriptor.contract_version==='1.1'){
    contract.observation_capabilities=structuredClone(descriptor.observation_capabilities);
    contract.observation_qualities=descriptor.observation_capabilities.map(c=>c.quality);
  }else contract.observation_qualities=[...descriptor.observation_qualities];
  return{...call,context:{...(call.context||{}),adapter_contract:contract}};
}
export async function runAdapterConformance(adapter,fixtures=[]){const descriptor=adapter?.descriptor;const dv=validateAdapterDescriptor(descriptor);const errors=[...dv.errors],results=[];if(typeof adapter?.normalize!=='function')errors.push('adapter.normalize is required');if(descriptor?.mode==='execute'&&typeof adapter?.execute!=='function')errors.push('execute-mode adapter.execute is required');if(errors.length)return{ok:false,errors,results};for(const [index,fixture]of fixtures.entries()){try{const call=await adapter.normalize(fixture.input,fixture.options||{});const validation=validateNormalizedToolCall(call);const contract=call?.context?.adapter_contract;if(!validation.valid)errors.push(`fixture ${index}: ${validation.errors.join('; ')}`);if(!contract||contract.adapter_id!==descriptor.adapter_id)errors.push(`fixture ${index}: normalized call missing matching adapter contract`);results.push({index,valid:validation.valid,call});}catch(error){errors.push(`fixture ${index}: ${error.message}`);results.push({index,valid:false,error:error.message});}}return{ok:errors.length===0,errors,results};}
export function validateEffectReceiptAgainstAdapter(receipt,descriptor){
  const errors=[];const dv=validateAdapterDescriptor(descriptor);errors.push(...dv.errors);const ev=validateEffectReceipt(receipt);errors.push(...ev.errors);
  if(receipt?.adapter&&descriptor?.adapter_id&&receipt.adapter!==descriptor.adapter_id)errors.push(`effect receipt adapter mismatch: expected ${descriptor.adapter_id}`);
  if(receipt?.effect_version==='1.0'){
    if(descriptor?.contract_version==='1.0'&&receipt?.observation_quality&&!descriptor.observation_qualities?.includes(receipt.observation_quality))errors.push(`adapter ${descriptor?.adapter_id||'unknown'} does not declare observation quality ${receipt.observation_quality}`);
  }
  if(receipt?.effect_version==='1.1'){
    if(receipt.adapter_contract_version!==descriptor?.contract_version)errors.push(`adapter contract version mismatch: receipt ${receipt.adapter_contract_version||'missing'} vs descriptor ${descriptor?.contract_version||'missing'}`);
    if(descriptor?.contract_version!=='1.1')errors.push('EffectReceipt v1.1 requires Adapter Contract v1.1');
    else{
      const capability=observationCapability(descriptor,receipt.observation_quality);
      if(!capability)errors.push(`adapter ${descriptor.adapter_id} does not declare observation quality ${receipt.observation_quality}`);
      else{
        if(receipt.observation_boundary!==capability.boundary)errors.push(`adapter ${descriptor.adapter_id} observation boundary mismatch: expected ${capability.boundary}`);
        if(!capability.statuses.includes(receipt.status))errors.push(`adapter ${descriptor.adapter_id} does not permit status ${receipt.status} for ${receipt.observation_quality}`);
      }
    }
  }
  return{ok:errors.length===0,errors};
}
