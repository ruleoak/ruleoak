/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */

export const INTENT_EVIDENCE_AUTHORITY_VERSIONS = Object.freeze(['0.1']);
export const INTENT_EVIDENCE_CLASSES = Object.freeze(['STATIC','UNIT','INTEGRATION','PROPERTY','BUILD','RUNTIME','DEVICE','EXTERNAL','MANUAL','MODEL_INFERENCE']);
export const INTENT_EVIDENCE_STATUSES = Object.freeze(['PASS','FAIL','UNKNOWN','NOT_RUN','STALE','CONFLICTED']);
export const INTENT_EVIDENCE_PRODUCER_KINDS = Object.freeze(['tool','test_runner','ci','runtime','device','external_system','human','model','agent','unknown']);
export const INTENT_EVIDENCE_VERIFICATION_METHODS = Object.freeze(['deterministic_check','test_execution','static_analysis','runtime_observation','device_observation','external_observation','manual_review','signed_attestation','model_inference','self_assertion','unknown']);
export const INTENT_EVIDENCE_AGGREGATIONS = Object.freeze(['all','any']);

const ID_RE=/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const SHA_RE=/^sha256:[0-9a-f]{64}$/;
const ARRAY_SET_FIELDS=new Set(['claim_ids','evidence_requirement_ids','capability_ids','observation_ids','supersedes_ids']);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const result=(errors,warnings=[])=>({valid:errors.length===0,isValid:errors.length===0,errors,warnings,errorMessage:errors.join('; ')});
function validateId(v,path,errors){if(typeof v!=='string'||!ID_RE.test(v))errors.push(`${path} must match ${ID_RE}`);}
function requireString(v,path,errors){if(typeof v!=='string'||!v.trim())errors.push(`${path} must be a non-empty string`);}
function optionalString(v,path,errors){if(v!==undefined&&typeof v!=='string')errors.push(`${path} must be a string when present`);}
function stringArray(v,path,errors){if(v===undefined)return;if(!Array.isArray(v)){errors.push(`${path} must be an array`);return;}const seen=new Set();v.forEach((x,i)=>{if(typeof x!=='string'||!x)errors.push(`${path}[${i}] must be a non-empty string`);else if(seen.has(x))errors.push(`${path} contains duplicate value: ${x}`);else seen.add(x);});}
function iso(v,path,errors){if(v===undefined)return;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))errors.push(`${path} must be an ISO-8601 timestamp`);}
function allowed(obj,keys,path,errors){for(const k of Object.keys(obj))if(!keys.has(k))errors.push(`${path}.${k} is not supported by Intent Evidence Authority 0.1`);}
function validateProvenance(p,path,errors){if(!isObject(p)){errors.push(`${path} must be an object`);return;}allowed(p,new Set(['producer_kind','producer_id','verification_method','source']),path,errors);if(!INTENT_EVIDENCE_PRODUCER_KINDS.includes(p.producer_kind))errors.push(`${path}.producer_kind is invalid`);requireString(p.producer_id,`${path}.producer_id`,errors);if(!INTENT_EVIDENCE_VERIFICATION_METHODS.includes(p.verification_method))errors.push(`${path}.verification_method is invalid`);optionalString(p.source,`${path}.source`,errors);}
function validateAttestation(a,path,errors){if(a===undefined)return;if(!isObject(a)){errors.push(`${path} must be an object`);return;}allowed(a,new Set(['format','algorithm','key_id','subject_digest','signature_base64']),path,errors);if(a.format!=='ruleoak-signed-digest-v1')errors.push(`${path}.format must be ruleoak-signed-digest-v1`);if(a.algorithm!=='ed25519')errors.push(`${path}.algorithm must be ed25519`);requireString(a.key_id,`${path}.key_id`,errors);if(typeof a.subject_digest!=='string'||!SHA_RE.test(a.subject_digest))errors.push(`${path}.subject_digest must be sha256:<64 lowercase hex>`);requireString(a.signature_base64,`${path}.signature_base64`,errors);}
function validateArtifact(a,path,errors){if(a===undefined)return;if(!isObject(a)){errors.push(`${path} must be an object`);return;}allowed(a,new Set(['path','digest','size_bytes','media_type']),path,errors);optionalString(a.path,`${path}.path`,errors);if(a.digest!==undefined&&(typeof a.digest!=='string'||!SHA_RE.test(a.digest)))errors.push(`${path}.digest must be sha256:<64 lowercase hex>`);if(a.size_bytes!==undefined&&(!Number.isInteger(a.size_bytes)||a.size_bytes<0))errors.push(`${path}.size_bytes must be a non-negative integer`);optionalString(a.media_type,`${path}.media_type`,errors);}
function validateObservation(o,i,errors,registry){const path=`observations[${i}]`;if(!isObject(o)){errors.push(`${path} must be an object`);return;}allowed(o,new Set(['id','status','statement','provenance','observed_at','valid_from','valid_until','artifact','attestation','supersedes_ids']),path,errors);validateId(o.id,`${path}.id`,errors);if(registry.has(o.id))errors.push(`duplicate evidence bundle id: ${o.id}`);else registry.set(o.id,{kind:'observation',path});if(!INTENT_EVIDENCE_STATUSES.includes(o.status))errors.push(`${path}.status is invalid`);requireString(o.statement,`${path}.statement`,errors);validateProvenance(o.provenance,`${path}.provenance`,errors);iso(o.observed_at,`${path}.observed_at`,errors);iso(o.valid_from,`${path}.valid_from`,errors);iso(o.valid_until,`${path}.valid_until`,errors);validateArtifact(o.artifact,`${path}.artifact`,errors);validateAttestation(o.attestation,`${path}.attestation`,errors);stringArray(o.supersedes_ids,`${path}.supersedes_ids`,errors);if(o.valid_from&&o.valid_until&&Date.parse(o.valid_from)>Date.parse(o.valid_until))errors.push(`${path}.valid_from must not be after valid_until`);}
function validateEvidence(e,i,errors,registry){const path=`evidence[${i}]`;if(!isObject(e)){errors.push(`${path} must be an object`);return;}allowed(e,new Set(['id','evidence_class','statement','aggregation','observation_ids','claim_ids','evidence_requirement_ids','capability_ids']),path,errors);validateId(e.id,`${path}.id`,errors);if(registry.has(e.id))errors.push(`duplicate evidence bundle id: ${e.id}`);else registry.set(e.id,{kind:'evidence',path});if(!INTENT_EVIDENCE_CLASSES.includes(e.evidence_class))errors.push(`${path}.evidence_class is invalid`);requireString(e.statement,`${path}.statement`,errors);if(e.aggregation!==undefined&&!INTENT_EVIDENCE_AGGREGATIONS.includes(e.aggregation))errors.push(`${path}.aggregation is invalid`);stringArray(e.observation_ids,`${path}.observation_ids`,errors);if(!Array.isArray(e.observation_ids)||e.observation_ids.length===0)errors.push(`${path}.observation_ids must be a non-empty array`);for(const f of ['claim_ids','evidence_requirement_ids','capability_ids'])stringArray(e[f],`${path}.${f}`,errors);if(!(e.claim_ids?.length||e.evidence_requirement_ids?.length||e.capability_ids?.length))errors.push(`${path} must bind at least one claim, evidence requirement, or capability`);}

export function validateIntentEvidenceBundle(bundle){
 const errors=[],warnings=[];if(!isObject(bundle))return result(['intent evidence bundle must be an object']);
 allowed(bundle,new Set(['evidence_authority_version','bundle_id','intent_manifest_id','observations','evidence']), 'bundle', errors);
 if(!INTENT_EVIDENCE_AUTHORITY_VERSIONS.includes(bundle.evidence_authority_version))errors.push(`evidence_authority_version must be one of: ${INTENT_EVIDENCE_AUTHORITY_VERSIONS.join(', ')}`);
 validateId(bundle.bundle_id,'bundle_id',errors);validateId(bundle.intent_manifest_id,'intent_manifest_id',errors);
 if(!Array.isArray(bundle.observations))errors.push('observations must be an array');if(!Array.isArray(bundle.evidence))errors.push('evidence must be an array');
 const registry=new Map();(bundle.observations||[]).forEach((o,i)=>validateObservation(o,i,errors,registry));(bundle.evidence||[]).forEach((e,i)=>validateEvidence(e,i,errors,registry));
 const obsIds=new Set((bundle.observations||[]).map(x=>x?.id).filter(Boolean));
 for(const [i,e] of (bundle.evidence||[]).entries())for(const id of e?.observation_ids||[])if(!obsIds.has(id))errors.push(`evidence[${i}].observation_ids references unknown observation: ${id}`);
 for(const [i,o] of (bundle.observations||[]).entries())for(const id of o?.supersedes_ids||[])if(!obsIds.has(id))errors.push(`observations[${i}].supersedes_ids references unknown observation: ${id}`);
 return result(errors,warnings);
}
function sortObject(value,key=''){if(Array.isArray(value)){const rows=value.map(v=>sortObject(v));if(ARRAY_SET_FIELDS.has(key)&&rows.every(v=>typeof v==='string'))return rows.sort();if(['observations','evidence'].includes(key)&&rows.every(v=>isObject(v)&&typeof v.id==='string'))return rows.sort((a,b)=>a.id.localeCompare(b.id));return rows;}if(!isObject(value))return value;const out={};for(const k of Object.keys(value).sort())out[k]=sortObject(value[k],k);return out;}
export function normalizeIntentEvidenceBundle(bundle){return sortObject(JSON.parse(JSON.stringify(bundle)));}
function encode(value){if(Array.isArray(value))return `[${value.map(encode).join(',')}]`;if(isObject(value))return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${encode(value[k])}`).join(',')}}`;return JSON.stringify(value);}
export function canonicalIntentEvidenceJson(bundle){return encode(normalizeIntentEvidenceBundle(bundle));}

export function validateIntentVerificationResult(report){
 const errors=[];if(!isObject(report))return result(['intent verification result must be an object']);
 if(report.evidence_authority_version!=='0.1')errors.push('evidence_authority_version must be 0.1');
 if(typeof report.intent_manifest_id!=='string'||!ID_RE.test(report.intent_manifest_id))errors.push('intent_manifest_id is invalid');
 if(!INTENT_EVIDENCE_STATUSES.includes(report.overall_status))errors.push('overall_status is invalid');
 if(!Array.isArray(report.requirements)||!Array.isArray(report.claims)||!Array.isArray(report.evidence_records)||!Array.isArray(report.observations)||!Array.isArray(report.contradictions))errors.push('verification result collections are invalid');
 if(!isObject(report.coverage)||typeof report.coverage.required_type_slots!=='number'||typeof report.coverage.satisfied_type_slots!=='number'||typeof report.coverage.percent!=='number')errors.push('coverage is invalid');
 return result(errors);
}
