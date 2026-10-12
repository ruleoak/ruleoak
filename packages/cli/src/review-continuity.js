/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {atomicWriteFileSync} from './io/durable-file.js';

export const REVIEW_PROFILE_VERSION='0.1';
export const REVIEW_RECEIPT_VERSION='0.1';
const sha=v=>createHash('sha256').update(v).digest('hex');
const stable=v=>JSON.stringify(sort(v));
function sort(v){if(Array.isArray(v))return v.map(sort);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])]));return v;}
const arr=v=>Array.isArray(v)?v:[];
const uniq=v=>[...new Set(v.filter(Boolean))].sort();
function readJson(path,label,max=256*1024){const p=resolve(path);const b=readFileSync(p);if(b.length>max)throw new Error(`${label} exceeds ${max} bytes`);let v;try{v=JSON.parse(b.toString('utf8'));}catch{throw new Error(`${label} is not valid JSON`);}return v;}
function writeJson(path,value,label){const p=resolve(path);atomicWriteFileSync(p,JSON.stringify(value,null,2)+'\n',{mode:0o600,maxBytes:512*1024,label});return p;}

export function buildReviewProfile(options={}){
  const profile={review_profile_version:REVIEW_PROFILE_VERSION,intent_file:options.intentFile||null,binding_files:uniq(arr(options.bindingFiles).map(String)),memory_files:uniq(arr(options.memoryFiles).map(String)),handoff:{disabled:Boolean(options.noHandoff),inbox:options.noHandoff?null:(options.handoffInbox||null),name:options.handoffName||null},authority:'Profile reuses local review inputs only. It does not grant authority, suppress evidence requirements, or change protected qualification policy.'};
  profile.profile_sha256=sha(stable(profile));return profile;
}
export function loadReviewProfile(path){const v=readJson(path,'review profile');if(v?.review_profile_version!==REVIEW_PROFILE_VERSION)throw new Error('unsupported review profile version');const expected=v.profile_sha256;const copy={...v};delete copy.profile_sha256;if(!expected||expected!==sha(stable(copy)))throw new Error('review profile digest mismatch');return v;}
export function writeReviewProfile(profile,path){return writeJson(path,profile,'review profile');}
export function applyReviewProfile(profile,options={}){
  const conflict=(name,a,b)=>{if(a!=null&&b!=null&&stable(a)!==stable(b))throw new Error(`review profile conflicts with explicit ${name}`);return a!=null?a:b;};
  return {...options,intentFile:conflict('--intent-file',options.intentFile,profile.intent_file),bindingFiles:conflict('--binding',options.bindingFiles?.length?options.bindingFiles:null,profile.binding_files),memoryFiles:conflict('--memory',options.memoryFiles?.length?options.memoryFiles:null,profile.memory_files),noHandoff:conflict('--no-handoff',options.noHandoff?true:null,profile.handoff?.disabled),handoffInbox:conflict('--handoff-inbox',options.handoffInbox,profile.handoff?.inbox),handoffName:conflict('--handoff-name',options.handoffName,profile.handoff?.name)};
}
function evidenceState(report){return arr(report?.verification?.requirements).map(x=>({requirement_id:x?.requirement_id||null,status:x?.status||'UNKNOWN',evidence_types:uniq(arr(x?.type_results).map(t=>`${t?.evidence_type||'unknown'}:${t?.status||'UNKNOWN'}`))})).sort((a,b)=>(a.requirement_id||'').localeCompare(b.requirement_id||''));}
export function buildReviewReceipt(report,{createdAt=null}={}){
  const q=report?.qualification?.bindings||{};const review=report?.candidate_review||{};
  const core={review_receipt_version:REVIEW_RECEIPT_VERSION,created_at:createdAt||new Date().toISOString(),decision:review.decision||report?.status||'REVIEW_INCOMPLETE',identity:{candidate_sha256:report?.implementation?.source_sha256||q.candidate_sha256||null,baseline_sha256:q.baseline_sha256||null,intent_manifest_sha256:q.intent_manifest_sha256||null,qualification_policy_sha256:q.policy_sha256||null},affected_capability_ids:uniq(arr(review?.changed_behavior?.affected_capability_ids)),evidence_state:evidenceState(report),unknown_codes:uniq(arr(review?.unknowns).map(x=>x?.code)),protected_check_state:arr(report?.qualification?.results).map(x=>({check_id:x?.id||null,status:x?.status||'UNKNOWN'})).sort((a,b)=>(a.check_id||'').localeCompare(b.check_id||'')),authority:'Receipt records one completed review. Reuse requires exact identity checks; prior PASS never authorizes a changed candidate or changed rules.'};
  return {...core,receipt_sha256:sha(stable(core))};
}
export function writeReviewReceipt(receipt,path){return writeJson(path,receipt,'review receipt');}
export function loadReviewReceipt(path){const v=readJson(path,'review receipt');if(v?.review_receipt_version!==REVIEW_RECEIPT_VERSION)throw new Error('unsupported review receipt version');const expected=v.receipt_sha256;const copy={...v};delete copy.receipt_sha256;if(!expected||expected!==sha(stable(copy)))throw new Error('review receipt digest mismatch');return v;}
export function compareReviewReceipts(previous,current){
  const identityKeys=['baseline_sha256','intent_manifest_sha256','qualification_policy_sha256'];const invalidating=identityKeys.filter(k=>(previous?.identity?.[k]||null)!==(current?.identity?.[k]||null));
  const candidateChanged=(previous?.identity?.candidate_sha256||null)!==(current?.identity?.candidate_sha256||null);
  const prior=new Map(arr(previous?.evidence_state).map(x=>[x.requirement_id,x.status]));const changedEvidence=arr(current?.evidence_state).filter(x=>prior.get(x.requirement_id)!==x.status).map(x=>({requirement_id:x.requirement_id,before:prior.get(x.requirement_id)||'ABSENT',after:x.status}));
  return {review_comparison_version:'0.1',previous_receipt_sha256:previous?.receipt_sha256||null,current_receipt_sha256:current?.receipt_sha256||null,candidate_changed:candidateChanged,prior_evidence_reusable:!candidateChanged&&!invalidating.length,invalidating_identity_changes:invalidating,decision:{before:previous?.decision||null,after:current?.decision||null,changed:previous?.decision!==current?.decision},affected_capability_delta:{added:arr(current?.affected_capability_ids).filter(x=>!arr(previous?.affected_capability_ids).includes(x)),removed:arr(previous?.affected_capability_ids).filter(x=>!arr(current?.affected_capability_ids).includes(x))},evidence_status_changes:changedEvidence,authority:'Comparison is descriptive. If candidate, baseline, intent, or qualification policy identity changes, prior evidence is not carried forward as current proof.'};
}
