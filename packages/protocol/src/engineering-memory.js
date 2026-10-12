/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const ENGINEERING_MEMORY_VERSIONS=Object.freeze(['0.1']);
export const ENGINEERING_MEMORY_RECORD_TYPES=Object.freeze(['Observation','Incident','Cause','Decision','Resolution','Regression','InvariantIntroduced','Evidence','Supersession']);
export const ENGINEERING_MEMORY_STATUSES=Object.freeze(['active','historical','resolved','superseded']);
export const ENGINEERING_MEMORY_PROVENANCE=Object.freeze(['OBSERVED','DECLARED','INFERRED']);
const ID_RE=/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=(errors,warnings=[])=>({valid:errors.length===0,isValid:errors.length===0,errors,warnings,errorMessage:errors.join('; ')});
const req=(v,p,e)=>{if(typeof v!=='string'||!v.trim())e.push(`${p} must be a non-empty string`);};
const id=(v,p,e)=>{if(typeof v!=='string'||!ID_RE.test(v))e.push(`${p} must be a stable ID`);};
const arr=(v,p,e)=>{if(v!==undefined&&!Array.isArray(v))e.push(`${p} must be an array`);};
const iso=(v,p,e)=>{if(v===undefined||v===null)return;if(typeof v!=='string'||Number.isNaN(Date.parse(v)))e.push(`${p} must be an ISO date-time`);};
export function validateEngineeringMemoryBundle(bundle){
 const e=[],w=[];if(!isObject(bundle))return result(['Engineering Memory bundle must be an object']);
 if(!ENGINEERING_MEMORY_VERSIONS.includes(bundle.engineering_memory_version))e.push(`engineering_memory_version must be one of: ${ENGINEERING_MEMORY_VERSIONS.join(', ')}`);
 id(bundle.bundle_id,'bundle_id',e);if(!Array.isArray(bundle.records))e.push('records must be an array');
 const ids=new Set();for(const [i,r] of (bundle.records||[]).entries()){
  const p=`records[${i}]`;if(!isObject(r)){e.push(`${p} must be an object`);continue;}id(r.id,`${p}.id`,e);if(ids.has(r.id))e.push(`${p}.id duplicates ${r.id}`);ids.add(r.id);
  if(!ENGINEERING_MEMORY_RECORD_TYPES.includes(r.type))e.push(`${p}.type is invalid`);req(r.statement,`${p}.statement`,e);if(!ENGINEERING_MEMORY_STATUSES.includes(r.status))e.push(`${p}.status is invalid`);
  for(const k of ['capability_ids','invariant_ids','evidence_requirement_ids','related_record_ids','trigger_terms','required_evidence_types','plan_actions','tags'])arr(r[k],`${p}.${k}`,e);
  iso(r.observed_at,`${p}.observed_at`,e);iso(r.effective_from,`${p}.effective_from`,e);iso(r.effective_until,`${p}.effective_until`,e);if(r.effective_from&&r.effective_until&&Date.parse(r.effective_until)<Date.parse(r.effective_from))e.push(`${p}.effective_until precedes effective_from`);
  if(!isObject(r.provenance))e.push(`${p}.provenance must be an object`);else{if(!ENGINEERING_MEMORY_PROVENANCE.includes(r.provenance.class))e.push(`${p}.provenance.class invalid`);req(r.provenance.method,`${p}.provenance.method`,e);req(r.provenance.source,`${p}.provenance.source`,e);if(r.provenance.class==='INFERRED'&&!(typeof r.provenance.confidence==='number'&&r.provenance.confidence>=0&&r.provenance.confidence<1))e.push(`${p}.provenance.confidence must be >=0 and <1 for INFERRED`);if(r.provenance.class!=='INFERRED'&&r.provenance.confidence!==undefined&&r.provenance.confidence!==1)e.push(`${p}.provenance.confidence must be 1 when provided for OBSERVED/DECLARED`);}
 }
 for(const [i,r] of (bundle.records||[]).entries())for(const ref of r.related_record_ids||[])if(!ids.has(ref))w.push(`records[${i}].related_record_ids references external/unresolved record ${ref}`);
 return result(e,w);
}
