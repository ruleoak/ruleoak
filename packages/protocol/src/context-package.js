/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */

export const CONTEXT_PACKAGE_VERSIONS=Object.freeze(['0.1']);
export const CONTEXT_PROVENANCE=Object.freeze(['DETERMINISTIC','OBSERVED','DECLARED','INFERRED','UNKNOWN']);
export const CONTEXT_SLICE_KINDS=Object.freeze(['implementation','test','configuration','intent']);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=(errors,warnings=[])=>({valid:errors.length===0,isValid:errors.length===0,errors,warnings,errorMessage:errors.join('; ')});
const req=(v,p,e)=>{if(typeof v!=='string'||!v.trim())e.push(`${p} must be a non-empty string`);};
const arr=(v,p,e)=>{if(!Array.isArray(v))e.push(`${p} must be an array`);};
export function validateContextPackage(pkg){
 const e=[];if(!isObject(pkg))return result(['Context Package must be an object']);
 if(!CONTEXT_PACKAGE_VERSIONS.includes(pkg.context_package_version))e.push(`context_package_version must be one of: ${CONTEXT_PACKAGE_VERSIONS.join(', ')}`);
 req(pkg.package_id,'package_id',e);req(pkg.task,'task',e);req(pkg.compiler?.id,'compiler.id',e);
 if(!isObject(pkg.source))e.push('source must be an object');else{req(pkg.source.intent_manifest_id,'source.intent_manifest_id',e);req(pkg.source.repository_graph_digest,'source.repository_graph_digest',e);req(pkg.source.impact_digest,'source.impact_digest',e);}
 if(!isObject(pkg.budget))e.push('budget must be an object');else for(const k of ['max_context_bytes','max_files','max_slice_lines'])if(!Number.isInteger(pkg.budget[k])||pkg.budget[k]<1)e.push(`budget.${k} must be a positive integer`);
 if(!isObject(pkg.intent))e.push('intent must be an object');else for(const k of ['capabilities','goals','scenarios','invariants','constraints','budgets','authorities','risks','incidents','decisions','evidence_requirements'])arr(pkg.intent[k],`intent.${k}`,e);
 arr(pkg.source_slices,'source_slices',e);arr(pkg.test_slices,'test_slices',e);arr(pkg.uncertainties,'uncertainties',e);
 for(const [group,rows] of [['source_slices',pkg.source_slices],['test_slices',pkg.test_slices]])if(Array.isArray(rows))for(const [i,row] of rows.entries()){
  if(!isObject(row)){e.push(`${group}[${i}] must be an object`);continue;}req(row.path,`${group}[${i}].path`,e);if(!CONTEXT_SLICE_KINDS.includes(row.kind))e.push(`${group}[${i}].kind invalid`);if(!CONTEXT_PROVENANCE.includes(row.provenance))e.push(`${group}[${i}].provenance invalid`);if(!Number.isInteger(row.start_line)||row.start_line<1)e.push(`${group}[${i}].start_line invalid`);if(!Number.isInteger(row.end_line)||row.end_line<row.start_line)e.push(`${group}[${i}].end_line invalid`);req(row.sha256,`${group}[${i}].sha256`,e);if(typeof row.content!=='string')e.push(`${group}[${i}].content must be a string`);
 }
 if(pkg.engineering_memory!==undefined){if(!isObject(pkg.engineering_memory))e.push('engineering_memory must be an object');else{arr(pkg.engineering_memory.records,'engineering_memory.records',e);arr(pkg.engineering_memory.regressions,'engineering_memory.regressions',e);arr(pkg.engineering_memory.required_evidence_types,'engineering_memory.required_evidence_types',e);arr(pkg.engineering_memory.plan_actions,'engineering_memory.plan_actions',e);}}
 if(!isObject(pkg.exclusions))e.push('exclusions must be an object');else arr(pkg.exclusions.categories,'exclusions.categories',e);
 if(!isObject(pkg.accounting))e.push('accounting must be an object');else for(const k of ['included_files','included_bytes','naive_bytes','estimated_tokens','reduction_ratio'])if(typeof pkg.accounting[k]!=='number'||!Number.isFinite(pkg.accounting[k])||pkg.accounting[k]<0)e.push(`accounting.${k} must be a finite non-negative number`);
 if(!isObject(pkg.sufficiency))e.push('sufficiency must be an object');else{if(typeof pkg.sufficiency.required_bound_module_coverage!=='number')e.push('sufficiency.required_bound_module_coverage must be a number');if(typeof pkg.sufficiency.required_intent_coverage!=='number')e.push('sufficiency.required_intent_coverage must be a number');}
 return result(e);
}
