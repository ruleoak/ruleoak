/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const INTENT_CHANGE_VERSIONS=Object.freeze(['0.1']);
export const IMPLEMENTATION_PROPOSAL_VERSIONS=Object.freeze(['0.1']);
export const INTENT_CHANGE_STATUSES=Object.freeze(['READY','BLOCKED','APPLIED_VERIFICATION_REQUIRED','APPLIED_VERIFIED','REJECTED']);
export const INTENT_CHANGE_ROLES=Object.freeze(['planner','implementer','reviewer','evidence_adjudicator']);
export const IMPLEMENTATION_PROPOSAL_OPERATIONS=Object.freeze(['write','delete']);
export const IMPLEMENTATION_PRODUCER_KINDS=Object.freeze(['agent','model','human','deterministic_tool']);
const ID_RE=/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const DIGEST_RE=/^sha256:[a-f0-9]{64}$/;
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=(errors,warnings=[])=>({valid:errors.length===0,isValid:errors.length===0,errors,warnings,errorMessage:errors.join('; ')});
const req=(v,p,e)=>{if(typeof v!=='string'||!v.trim())e.push(`${p} must be a non-empty string`);};
const id=(v,p,e)=>{if(typeof v!=='string'||!ID_RE.test(v))e.push(`${p} must be a stable ID`);};
const arr=(v,p,e)=>{if(!Array.isArray(v))e.push(`${p} must be an array`);};
const digest=(v,p,e,{nullable=false}={})=>{if(nullable&&v===null)return;if(typeof v!=='string'||!DIGEST_RE.test(v))e.push(`${p} must be sha256:<64 lowercase hex>`);};
export function validateIntentChangePlan(plan){
 const e=[];if(!isObject(plan))return result(['Intent Change plan must be an object']);
 if(!INTENT_CHANGE_VERSIONS.includes(plan.intent_change_version))e.push(`intent_change_version must be one of: ${INTENT_CHANGE_VERSIONS.join(', ')}`);
 id(plan.change_id,'change_id',e);id(plan.plan_id,'plan_id',e);req(plan.request,'request',e);
 if(!['dry-run','apply'].includes(plan.mode))e.push('mode must be dry-run or apply');
 if(!INTENT_CHANGE_STATUSES.includes(plan.status))e.push('status is invalid');
 if(!isObject(plan.intent_delta))e.push('intent_delta must be an object');else{if(plan.intent_delta.delta_version!=='0.1')e.push('intent_delta.delta_version must be 0.1');id(plan.intent_delta.delta_id,'intent_delta.delta_id',e);digest(plan.intent_delta.digest,'intent_delta.digest',e);arr(plan.intent_delta.operations,'intent_delta.operations',e);arr(plan.intent_delta.affected_capability_ids,'intent_delta.affected_capability_ids',e);}
 if(!isObject(plan.impact))e.push('impact must be an object');else{req(plan.impact.digest,'impact.digest',e);arr(plan.impact.affected_capability_ids,'impact.affected_capability_ids',e);arr(plan.impact.conflicts,'impact.conflicts',e);arr(plan.impact.uncertainties,'impact.uncertainties',e);}
 if(plan.engineering_memory!==undefined){if(!isObject(plan.engineering_memory))e.push('engineering_memory must be an object');else{arr(plan.engineering_memory.matched_record_ids,'engineering_memory.matched_record_ids',e);arr(plan.engineering_memory.historical_regression_ids,'engineering_memory.historical_regression_ids',e);arr(plan.engineering_memory.required_evidence_types,'engineering_memory.required_evidence_types',e);arr(plan.engineering_memory.plan_actions,'engineering_memory.plan_actions',e);}}
 if(!isObject(plan.allowed_scope))e.push('allowed_scope must be an object');else{for(const k of ['existing_paths','new_file_prefixes','denied_prefixes'])arr(plan.allowed_scope[k],`allowed_scope.${k}`,e);if(!Number.isInteger(plan.allowed_scope.max_files)||plan.allowed_scope.max_files<1)e.push('allowed_scope.max_files must be a positive integer');}
 if(!isObject(plan.roles))e.push('roles must be an object');else for(const r of INTENT_CHANGE_ROLES){if(!isObject(plan.roles[r]))e.push(`roles.${r} must be an object`);else req(plan.roles[r].authority,`roles.${r}.authority`,e);}
 if(!isObject(plan.gates))e.push('gates must be an object');
 arr(plan.plan_steps,'plan_steps',e);arr(plan.blockers,'blockers',e);arr(plan.warnings,'warnings',e);
 return result(e);
}
export function validateImplementationProposal(proposal){
 const e=[];if(!isObject(proposal))return result(['implementation proposal must be an object']);
 if(!IMPLEMENTATION_PROPOSAL_VERSIONS.includes(proposal.implementation_proposal_version))e.push(`implementation_proposal_version must be one of: ${IMPLEMENTATION_PROPOSAL_VERSIONS.join(', ')}`);
 id(proposal.proposal_id,'proposal_id',e);id(proposal.plan_id,'plan_id',e);
 if(!isObject(proposal.producer))e.push('producer must be an object');else{if(!IMPLEMENTATION_PRODUCER_KINDS.includes(proposal.producer.kind))e.push('producer.kind is invalid');req(proposal.producer.id,'producer.id',e);}
 if(!Array.isArray(proposal.changes)||proposal.changes.length===0)e.push('changes must be a non-empty array');else for(const [i,c] of proposal.changes.entries()){
  const p=`changes[${i}]`;if(!isObject(c)){e.push(`${p} must be an object`);continue;}req(c.path,`${p}.path`,e);if(!IMPLEMENTATION_PROPOSAL_OPERATIONS.includes(c.operation))e.push(`${p}.operation is invalid`);digest(c.before_sha256,`${p}.before_sha256`,e,{nullable:true});
  if(c.operation==='write'&&typeof c.content!=='string')e.push(`${p}.content must be a string for write`);if(c.operation==='delete'&&c.content!==undefined)e.push(`${p}.content is not allowed for delete`);
 }
 if(proposal.assertions!==undefined&&!Array.isArray(proposal.assertions))e.push('assertions must be an array when present');
 return result(e);
}
