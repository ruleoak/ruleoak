/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {resolve} from 'node:path';
import {atomicWriteFileSync} from './io/durable-file.js';

export const CANDIDATE_REVIEW_VERSION='0.1';
export const DEV_ACTIVATION_SNAPSHOT_VERSION='0.1';

const list=v=>Array.isArray(v)?v:[];
const unique=v=>[...new Set(v.filter(Boolean))];
const bounded=(v,n=20)=>list(v).slice(0,n);
const integer=v=>Number.isInteger(v)&&v>=0?v:0;

function reviewDecision(report){
  switch(report?.status){
    case 'VERIFIED': return 'VERIFIED_FOR_DECLARED_SCOPE';
    case 'VERIFICATION_REQUIRED': return 'EVIDENCE_REQUIRED';
    case 'FAILED': return 'PROTECTED_CHECKS_FAILED';
    case 'STOPPED':
    case 'BLOCKED': return 'BLOCKED';
    case 'PLAN_ONLY': return 'PLAN_ONLY';
    case 'IMPLEMENTER_UNAVAILABLE': return 'IMPLEMENTER_UNAVAILABLE';
    default: return 'REVIEW_INCOMPLETE';
  }
}

function changedBehavior(report){
  const semantic=report?.semantic_diff||{};
  return {
    declared_user_visible_changes:bounded(semantic.user_visible_behavior?.declared_changes),
    declared_failure_behavior_changes:bounded(semantic.failure_behavior?.declared_changes),
    declared_compatibility_changes:bounded(semantic.compatibility?.declared_changes),
    affected_capability_ids:unique(list(semantic.capability_changes).map(x=>x?.capability_id)).slice(0,50),
    implementation_changes:bounded(semantic.implementation_changes,50).map(x=>({
      change_type:x?.change_type||'unknown',
      path:x?.path||null,
      provenance:x?.provenance||'UNKNOWN',
      capability_ids:bounded(x?.capability_ids,20)
    })),
    runtime_effect:semantic.user_visible_behavior?.actual_runtime_effect||'UNKNOWN',
    risk_level:semantic.risks?.assessment?.level||'UNKNOWN',
    evidence_invalidated:bounded(semantic.evidence?.invalidated_requirements,50).map(x=>({
      requirement_id:x?.evidence_requirement_id||null,
      reason:x?.reason||null,
      provenance:x?.provenance||'UNKNOWN'
    }))
  };
}

function failedChecks(report){
  return bounded(list(report?.qualification?.results).filter(x=>x?.status!=='PASS'),50).map(x=>({
    check_id:x?.id||null,
    status:x?.status||'UNKNOWN',
    diagnostic:x?.diagnostic||null,
    evidence_type:x?.evidence_type||null,
    capability_ids:bounded(x?.qualification_binding?.capability_ids,20),
    evidence_requirement_ids:bounded(x?.qualification_binding?.evidence_requirement_ids,20),
    output_sha256:x?.output_sha256||null
  }));
}

function missingEvidence(report){
  return bounded(list(report?.verification?.requirements).filter(x=>x?.status!=='PASS'),50).map(x=>({
    requirement_id:x?.requirement_id||null,
    status:x?.status||'UNKNOWN',
    capability_ids:bounded(x?.capability_ids,20),
    evidence_types:unique(list(x?.type_results).filter(t=>t?.status!=='PASS').map(t=>t?.evidence_type)).slice(0,20)
  }));
}

function unknowns(report){
  const semantic=list(report?.semantic_diff?.uncertainties).map(x=>({
    code:x?.code||'semantic_uncertainty',
    subject:x?.subject||null,
    statement:x?.statement||null,
    provenance:x?.provenance||'UNKNOWN'
  }));
  const scope=list(report?.scope_review?.warnings).map(x=>({code:'scope_warning',subject:'candidate',statement:String(x),provenance:'DETERMINISTIC'}));
  const qualification=list(report?.qualification?.policy_warnings).map(x=>({code:'qualification_warning',subject:'qualification',statement:String(x),provenance:'DETERMINISTIC'}));
  return bounded([...semantic,...scope,...qualification],50);
}

function nextActions(report,checks,evidence){
  const actions=[];
  for(const error of bounded(report?.scope_review?.errors,5))actions.push({kind:'RESOLVE_SCOPE',target:String(error),action:'Restore the candidate to the deterministic Intent-Driven Change allowed scope, then rerun ruleoak dev.'});
  for(const check of checks.slice(0,5))actions.push({kind:'FIX_PROTECTED_CHECK',target:check.check_id,action:`Fix the candidate until baseline-owned protected check ${check.check_id||'<unknown>'} passes; do not replace or weaken the protected oracle.`});
  for(const item of evidence.slice(0,5)){
    const kinds=item.evidence_types.length?item.evidence_types.join(', '):'required';
    actions.push({kind:'PROVIDE_EVIDENCE',target:item.requirement_id,action:`Provide independently bound ${kinds} evidence for ${item.requirement_id||'<unknown>'}, then rerun verification.`});
  }
  if(report?.status==='PLAN_ONLY')actions.push({kind:'SUBMIT_CANDIDATE',target:null,action:'Submit an implementation candidate for the planned scope, then rerun ruleoak dev.'});
  if(report?.status==='IMPLEMENTER_UNAVAILABLE')actions.push({kind:'SUPPLY_EXTERNAL_CANDIDATE',target:null,action:'Produce the candidate in Chat or another external workflow and submit its source directory or ZIP to ruleoak dev.'});
  if(report?.status==='VERIFIED'){
    if(report?.handoff?.status==='SUBMITTED_FOR_EXTERNAL_QUALIFICATION')actions.push({kind:'RECONCILE_BUILD_EVIDENCE',target:null,action:'Reconcile returned build/native evidence against this exact candidate before release; handoff submission is not build evidence.'});
    else actions.push({kind:'REVIEW_OR_HANDOFF',target:null,action:'Review the verified declared scope; if native/build evidence is required, hand off the exact candidate ZIP and reconcile the returned evidence before release.'});
  }
  if(!actions.length)actions.push({kind:'REVIEW_REPORT',target:null,action:'Review the blocked or incomplete result, resolve the reported condition, and rerun ruleoak dev.'});
  return actions.slice(0,12);
}

function reviewMetrics(report,durationMs){
  const checks=list(report?.qualification?.results),requirements=list(report?.verification?.requirements),unknownCount=unknowns(report).length;
  return {
    review_duration_ms:Number.isFinite(Number(durationMs))?Math.max(0,Math.round(Number(durationMs))):null,
    changed_files:list(report?.scope_review?.changes).length,
    affected_capabilities:unique(list(report?.semantic_diff?.capability_changes).map(x=>x?.capability_id)).length,
    protected_checks_total:checks.length,
    protected_checks_passed:checks.filter(x=>x?.status==='PASS').length,
    protected_checks_non_pass:checks.filter(x=>x?.status!=='PASS').length,
    evidence_requirements_total:requirements.length,
    evidence_requirements_passed:requirements.filter(x=>x?.status==='PASS').length,
    evidence_requirements_non_pass:requirements.filter(x=>x?.status!=='PASS').length,
    unknown_count:unknownCount,
    ruleoak_model_calls:integer(report?.model_usage?.role_calls),
    ruleoak_hosted_model_calls:integer(report?.model_usage?.hosted_calls),
    ruleoak_model_tokens:integer(report?.model_usage?.total_tokens),
    manual_ruleoak_subcommands:integer(report?.human_interaction?.manual_ruleoak_subcommands),
    handoff_status:report?.handoff?.status||'NOT_RUN'
  };
}

export function buildCandidateReview(report,{durationMs=null}={}){
  const checks=failedChecks(report),evidence=missingEvidence(report),uncertain=unknowns(report);
  return {
    candidate_review_version:CANDIDATE_REVIEW_VERSION,
    decision:reviewDecision(report),
    changed_behavior:changedBehavior(report),
    failed_checks:checks,
    missing_evidence:evidence,
    unknowns:uncertain,
    next_actions:nextActions(report,checks,evidence),
    local_metrics:reviewMetrics(report,durationMs),
    authority:'This review summarizes existing RuleOak scope, protected qualification and evidence results. It does not create execution authority or turn UNKNOWN behavior into fact.'
  };
}

export function buildDevActivationSnapshot(report,{durationMs=null,generatedAt=null}={}){
  const review=report?.candidate_review||buildCandidateReview(report,{durationMs});
  const m=review.local_metrics;
  return {
    dev_activation_snapshot_version:DEV_ACTIVATION_SNAPSHOT_VERSION,
    generated_at:generatedAt||new Date().toISOString(),
    local_only:true,
    user_review_required_before_sharing:true,
    result:{
      decision:review.decision,
      verified_for_declared_scope:review.decision==='VERIFIED_FOR_DECLARED_SCOPE',
      changed_files:m.changed_files,
      affected_capabilities:m.affected_capabilities,
      protected_checks_total:m.protected_checks_total,
      protected_checks_passed:m.protected_checks_passed,
      protected_checks_non_pass:m.protected_checks_non_pass,
      evidence_requirements_total:m.evidence_requirements_total,
      evidence_requirements_passed:m.evidence_requirements_passed,
      evidence_requirements_non_pass:m.evidence_requirements_non_pass,
      unknown_count:m.unknown_count,
      review_duration_ms:m.review_duration_ms,
      ruleoak_model_calls:m.ruleoak_model_calls,
      ruleoak_hosted_model_calls:m.ruleoak_hosted_model_calls,
      ruleoak_model_tokens:m.ruleoak_model_tokens,
      manual_ruleoak_subcommands:m.manual_ruleoak_subcommands,
      handoff_status:m.handoff_status
    },
    self_report:{false_alerts_reported:null,review_useful:null},
    privacy:{
      repository_path_included:false,
      candidate_path_included:false,
      source_code_included:false,
      prompts_or_intent_text_included:false,
      usernames_or_hostname_included:false,
      credentials_included:false,
      raw_test_output_included:false,
      source_hashes_included:false
    },
    external_adoption_proven:false,
    claim_boundary:'This snapshot records aggregate local candidate-review activity only. It does not prove retention, willingness to pay, code correctness beyond declared evidence, prevented defects, or external adoption.'
  };
}

export function writeDevActivationSnapshot(snapshot,outPath){
  const path=resolve(outPath);
  atomicWriteFileSync(path,JSON.stringify(snapshot,null,2)+'\n',{mode:0o600,maxBytes:128*1024,label:'Dev activation snapshot'});
  return path;
}
