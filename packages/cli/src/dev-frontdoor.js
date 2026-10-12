/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {cpSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {runMultiFrontendDevelopment} from './multi-frontend-development.js';
import {buildCandidateReview,buildDevActivationSnapshot} from './candidate-review.js';

export const RULEOAK_DEV_FRONTDOOR_VERSION='0.1';
export const RULEOAK_DEV_BUILD_INBOX_ENV='RULEOAK_BUILD_INBOX';

export function resolveDevBuildInbox({cliValue,noHandoff=false,env=process.env}={}){
  if(noHandoff)return null;
  const configured=String(cliValue||env?.[RULEOAK_DEV_BUILD_INBOX_ENV]||'').trim();
  return configured?resolve(configured):null;
}

export async function runDevCandidate(rootDir,candidatePath,outcome,options={}){
  const candidate=String(candidatePath||'').trim();
  const intent=String(outcome||'').trim();
  if(!candidate)throw new Error('ruleoak dev requires <candidate-source.zip|source-dir>');
  if(!intent)throw new Error('ruleoak dev requires --intent "<desired outcome>" (or place the desired outcome after the candidate path)');
  const started=process.hrtime.bigint();
  const report=await runMultiFrontendDevelopment(resolve(rootDir||process.cwd()),intent,{
    implementationMode:'external',
    frontend:'chat',
    candidatePath:candidate,
    planOnly:Boolean(options.planOnly),
    promoteLearning:Boolean(options.promoteLearning),
    intentFile:options.intentFile,
    bindingFiles:options.bindingFiles||[],
    memoryFiles:options.memoryFiles||[],
    at:options.at,
    handoffInbox:resolveDevBuildInbox({cliValue:options.handoffInbox,noHandoff:options.noHandoff,env:options.env}),
    handoffName:options.handoffName,
    toolTimeoutMs:options.toolTimeoutMs
  });
  const durationMs=Number(process.hrtime.bigint()-started)/1_000_000;
  const candidateReview=buildCandidateReview(report,{durationMs});
  const devActivation=buildDevActivationSnapshot({...report,candidate_review:candidateReview},{durationMs,generatedAt:options.at||new Date().toISOString()});
  return {...report,candidate_review:candidateReview,dev_activation:devActivation};
}

function demoIntent(){return{
  intent_manifest_version:'0.1',manifest_id:'manifest.ruleoak.dev.demo',product:{id:'product.ruleoak.dev.demo',name:'RuleOak Dev Demo'},
  capabilities:[{id:'cap.station.switch',name:'Station switching',tags:['station','playback','switch'],goal_ids:['goal.station.switch'],evidence_requirement_ids:['evidence.station.switch']}],
  goals:[{id:'goal.station.switch',statement:'Switch playback to the newly selected station.',capability_ids:['cap.station.switch']}],
  evidence_requirements:[{id:'evidence.station.switch',statement:'Station switching unit behavior is verified.',evidence_types:['unit'],capability_ids:['cap.station.switch']}]
};}

function buildDemoWorkspace(parent){
  const base=join(parent,'base'),candidate=join(parent,'candidate');
  mkdirSync(join(base,'.ruleoak','intent'),{recursive:true});mkdirSync(join(base,'src'),{recursive:true});mkdirSync(join(base,'tests'),{recursive:true});
  const intent=demoIntent();
  writeFileSync(join(base,'.ruleoak','intent','demo.intent.json'),JSON.stringify(intent,null,2)+'\n');
  writeFileSync(join(base,'.ruleoak','intent','demo.binding.json'),JSON.stringify({binding_version:'0.1',intent_manifest_id:intent.manifest_id,implementation_id:'impl.ruleoak.dev.demo',language:'JavaScript',capability_bindings:[{capability_id:'cap.station.switch',modules:['src/player.js']}]} ,null,2)+'\n');
  writeFileSync(join(base,'src','player.js'),'export const selectedStation = () => "old";\n');
  writeFileSync(join(base,'tests','player.test.mjs'),'import assert from "node:assert/strict"; import {selectedStation} from "../src/player.js"; assert.equal(selectedStation(),"new"); console.log("station switch PASS");\n');
  writeFileSync(join(base,'package.json'),JSON.stringify({name:'ruleoak-dev-demo',version:'1.0.0',type:'module',scripts:{test:'node tests/player.test.mjs'}},null,2)+'\n');
  writeFileSync(join(base,'.ruleoak','qualification.json'),JSON.stringify({qualification_version:'1.0',oracles:[{id:'station.switch.acceptance',runner:'node',script:'tests/player.test.mjs',args:[],protected_files:['tests/player.test.mjs'],evidence_type:'unit',capability_ids:['cap.station.switch'],evidence_requirement_ids:['evidence.station.switch']}]},null,2)+'\n');
  cpSync(base,candidate,{recursive:true});
  writeFileSync(join(candidate,'src','player.js'),'export const selectedStation = () => "new";\n');
  return{base,candidate};
}

export async function runDevDemo(options={}){
  const parent=mkdtempSync(join(tmpdir(),'ruleoak-dev-demo-'));
  try{
    const {base,candidate}=buildDemoWorkspace(parent);
    return await runDevCandidate(base,candidate,'fix station switching so the newly selected station becomes authoritative',{
      at:options.at||'2026-09-09T00:00:00.000Z',
      noHandoff:true,
      env:{}
    });
  }finally{rmSync(parent,{recursive:true,force:true});}
}

export function renderDevReport(report,written=null){
  const review=report.candidate_review||buildCandidateReview(report);
  const scope=report.scope_review?.valid===true?'PASS':report.scope_review?'BLOCKED':'NOT_RUN';
  const changes=report.scope_review?.changes?.length??0;
  const verification=report.verification?.status||report.summary?.verification_status||'NOT_RUN';
  const behavior=review.changed_behavior||{};
  const lines=[
    'RuleOak Dev — AI writes. RuleOak verifies.',
    `Decision: ${review.decision}`,
    `Intent: ${report.outcome}`,
    `Status: ${report.status} · Verification: ${verification} · Scope: ${scope}`,
    `Changed files: ${changes} · Affected capabilities: ${review.local_metrics?.affected_capabilities??0} · Runtime effect: ${behavior.runtime_effect||'UNKNOWN'}`,
    ...boundedLines(behavior.declared_user_visible_changes,'Behavior',3),
    ...boundedLines(behavior.declared_failure_behavior_changes,'Failure behavior',2),
    ...boundedLines(behavior.declared_compatibility_changes,'Compatibility',2),
    ...boundedChanges(behavior.implementation_changes,5),
    ...review.failed_checks.slice(0,5).map(t=>`Failed check: ${t.check_id||'<unknown>'} ${t.status}${t.diagnostic?` (${t.diagnostic})`:''}`),
    ...review.missing_evidence.slice(0,5).map(q=>`Missing evidence: ${q.requirement_id||'<unknown>'} ${q.status}${q.evidence_types?.length?` [${q.evidence_types.join(', ')}]`:''}`),
    ...review.unknowns.slice(0,5).map(u=>`Unknown: ${u.code}${u.statement?` — ${u.statement}`:''}`),
    ...review.next_actions.slice(0,5).map((a,i)=>`Next ${i+1}: ${a.action}`),
    `Review facts: ${review.local_metrics?.review_duration_ms??'unknown'} ms · protected checks ${review.local_metrics?.protected_checks_passed??0}/${review.local_metrics?.protected_checks_total??0} pass · evidence ${review.local_metrics?.evidence_requirements_passed??0}/${review.local_metrics?.evidence_requirements_total??0} pass`,
    `RuleOak coding-model calls: ${report.model_usage?.role_calls??0} · model tokens: ${report.model_usage?.total_tokens??0}`,
    report.handoff?.status?`Build handoff: ${report.handoff.status}`:null,
    report.learning?`Learning candidates: ${report.learning.candidate_count||0} (implicit promotions: ${report.learning.implicit_promotions||0})`:null,
    written?`Report: ${written}`:null,
    report.review_comparison?`Prior receipt: ${report.review_comparison.prior_evidence_reusable?'REUSABLE_FOR_SAME_IDENTITY':'NOT_REUSABLE'} · decision ${report.review_comparison.decision.changed?'changed':'unchanged'}`:null,
    'Authority: external code remains non-authoritative; Intent-Driven Change scope, Intent Evidence Authority evidence, and Development Learning explicit learning promotion remain unchanged.'
  ].filter(Boolean);
  return lines.join('\n');
}

function boundedLines(values,label,max){
  return (Array.isArray(values)?values:[]).slice(0,max).map(value=>`${label}: ${typeof value==='string'?value:JSON.stringify(value)}`);
}
function boundedChanges(values,max){
  return (Array.isArray(values)?values:[]).slice(0,max).map(change=>`Implementation: ${change.change_type||'changed'} ${change.path||'<unknown>'}`);
}
