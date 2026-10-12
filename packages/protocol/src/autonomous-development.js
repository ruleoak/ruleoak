/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const AUTONOMOUS_DEVELOPMENT_VERSIONS=Object.freeze(['0.1']);
export const AUTONOMOUS_DEVELOPMENT_STATUSES=Object.freeze(['PLAN_ONLY','BLOCKED','IMPLEMENTER_UNAVAILABLE','FAILED','VERIFICATION_REQUIRED','VERIFIED','STOPPED']);
export const AUTONOMOUS_STOP_REASONS=Object.freeze(['NONE','AUTHORITY_GAP','PLAN_BLOCKED','IMPLEMENTER_UNAVAILABLE','PROPOSAL_REJECTED','TOOL_FAILURE','REPEATED_FAILURE','REPAIR_LIMIT','VERIFICATION_INCOMPLETE','PROTECTED_INTENT_CONFLICT']);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=errors=>({valid:errors.length===0,isValid:errors.length===0,errors,errorMessage:errors.join('; ')});
export function validateAutonomousDevelopmentReport(r){
 const e=[];if(!isObject(r))return result(['autonomous development report must be an object']);
 if(!AUTONOMOUS_DEVELOPMENT_VERSIONS.includes(r.autonomous_development_version))e.push('autonomous_development_version must be 0.1');
 if(typeof r.run_id!=='string'||!r.run_id)e.push('run_id is required');if(typeof r.outcome!=='string'||!r.outcome.trim())e.push('outcome is required');
 if(!AUTONOMOUS_DEVELOPMENT_STATUSES.includes(r.status))e.push('status is invalid');if(!AUTONOMOUS_STOP_REASONS.includes(r.stop_reason))e.push('stop_reason is invalid');
 if(!Array.isArray(r.stages))e.push('stages must be an array');if(!Array.isArray(r.attempts))e.push('attempts must be an array');
 if(!isObject(r.human_interaction))e.push('human_interaction must be an object');else{for(const k of ['manual_ruleoak_subcommands','manual_file_targets','manual_context_construction','manual_build_invocations','manual_evidence_bundles','interventions'])if(!Number.isInteger(r.human_interaction[k])||r.human_interaction[k]<0)e.push(`human_interaction.${k} must be a non-negative integer`);}
 if(!isObject(r.authority))e.push('authority must be an object');if(!isObject(r.summary))e.push('summary must be an object');
 return result(e);
}
