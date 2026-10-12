/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const MULTI_FRONTEND_DEVELOPMENT_VERSIONS=Object.freeze(['0.1']);
export const MULTI_FRONTEND_MODES=Object.freeze(['managed','external']);
export const MULTI_FRONTEND_SURFACES=Object.freeze(['cli','api','chat','external-agent']);
export const MULTI_FRONTEND_STATUSES=Object.freeze(['PLAN_ONLY','BLOCKED','IMPLEMENTER_UNAVAILABLE','FAILED','VERIFICATION_REQUIRED','VERIFIED','STOPPED']);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=errors=>({valid:errors.length===0,isValid:errors.length===0,errors,errorMessage:errors.join('; ')});
export function validateMultiFrontendDevelopmentReport(r){
 const e=[];if(!obj(r))return result(['multi frontend development report must be an object']);
 if(!MULTI_FRONTEND_DEVELOPMENT_VERSIONS.includes(r.multi_frontend_development_version))e.push('multi_frontend_development_version must be 0.1');
 if(typeof r.run_id!=='string'||!r.run_id)e.push('run_id is required');
 if(typeof r.outcome!=='string'||!r.outcome.trim())e.push('outcome is required');
 if(!MULTI_FRONTEND_MODES.includes(r.implementation?.mode))e.push('implementation.mode is invalid');
 if(!MULTI_FRONTEND_SURFACES.includes(r.frontend?.surface))e.push('frontend.surface is invalid');
 if(!MULTI_FRONTEND_STATUSES.includes(r.status))e.push('status is invalid');
 if(!obj(r.model_usage))e.push('model_usage must be an object');else{
  for(const k of ['role_calls','hosted_calls','input_tokens','output_tokens','total_tokens'])if(!Number.isInteger(r.model_usage[k])||r.model_usage[k]<0)e.push(`model_usage.${k} must be a non-negative integer`);
  if(r.implementation?.mode==='external'&&(r.model_usage.role_calls!==0||r.model_usage.hosted_calls!==0||r.model_usage.total_tokens!==0))e.push('external implementation mode must have zero RuleOak model calls/tokens');
 }
 if(!obj(r.authority))e.push('authority must be an object');
 if(!obj(r.verification))e.push('verification must be an object');
 return result(e);
}
