/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */

export const SEMANTIC_DIFF_VERSIONS = Object.freeze(['0.1']);
export const SEMANTIC_DIFF_PROVENANCE = Object.freeze(['DETERMINISTIC','OBSERVED','INFERRED','UNKNOWN']);
export const SEMANTIC_DIFF_CHANGE_TYPES = Object.freeze(['added','removed','modified']);
export const SEMANTIC_DIFF_DIRECTIONS = Object.freeze(['strengthened','weakened','changed','unchanged']);

const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=(errors,warnings=[])=>({valid:errors.length===0,isValid:errors.length===0,errors,warnings,errorMessage:errors.join('; ')});
function requireString(v,path,errors){if(typeof v!=='string'||!v.trim())errors.push(`${path} must be a non-empty string`);}
function validateProvenance(v,path,errors){if(!SEMANTIC_DIFF_PROVENANCE.includes(v))errors.push(`${path} must be one of: ${SEMANTIC_DIFF_PROVENANCE.join(', ')}`);}
function validateChangeRows(rows,path,errors){if(!Array.isArray(rows)){errors.push(`${path} must be an array`);return;}for(const [i,row] of rows.entries()){if(!isObject(row)){errors.push(`${path}[${i}] must be an object`);continue;}requireString(row.id,`${path}[${i}].id`,errors);if(!SEMANTIC_DIFF_CHANGE_TYPES.includes(row.change_type))errors.push(`${path}[${i}].change_type is invalid`);validateProvenance(row.provenance,`${path}[${i}].provenance`,errors);if(!Array.isArray(row.changed_fields))errors.push(`${path}[${i}].changed_fields must be an array`);}}

export function validateSemanticDiff(report){
 const errors=[];if(!isObject(report))return result(['semantic diff must be an object']);
 if(!SEMANTIC_DIFF_VERSIONS.includes(report.semantic_diff_version))errors.push(`semantic_diff_version must be one of: ${SEMANTIC_DIFF_VERSIONS.join(', ')}`);
 for(const side of ['base','candidate']){if(!isObject(report[side]))errors.push(`${side} must be an object`);else{requireString(report[side].label,`${side}.label`,errors);requireString(report[side].source_type,`${side}.source_type`,errors);if(typeof report[side].intent_digest!=='string')errors.push(`${side}.intent_digest must be a string`);}}
 if(!isObject(report.entity_changes))errors.push('entity_changes must be an object');else for(const [kind,rows] of Object.entries(report.entity_changes))validateChangeRows(rows,`entity_changes.${kind}`,errors);
 for(const key of ['capability_changes','implementation_changes','guarantees','budgets','authorities','user_visible_behavior','failure_behavior','compatibility','evidence','risks','uncertainties','summary'])if(report[key]===undefined)errors.push(`${key} is required`);
 if(!Array.isArray(report.capability_changes))errors.push('capability_changes must be an array');
 if(!Array.isArray(report.implementation_changes))errors.push('implementation_changes must be an array');
 if(!Array.isArray(report.uncertainties))errors.push('uncertainties must be an array');
 return result(errors);
}
