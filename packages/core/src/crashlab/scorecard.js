/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync } from 'node:fs';
import { RELIABILITY_SCORECARD_VERSIONS, RELIABILITY_SCORECARD_DIMENSIONS as PROTOCOL_RELIABILITY_SCORECARD_DIMENSIONS, RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS } from '@ruleoak/protocol';

const CORE_VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

export const RELIABILITY_SCORECARD_VERSION = RELIABILITY_SCORECARD_VERSIONS[0];
export const RELIABILITY_SCORECARD_DIMENSIONS = Object.freeze([...PROTOCOL_RELIABILITY_SCORECARD_DIMENSIONS]);
export const RELIABILITY_CI_EXIT_CODES = Object.freeze({ PASS: 0, FAIL: 2 });

function clone(value){return JSON.parse(JSON.stringify(value));}
function compareText(a,b){const left=String(a),right=String(b);return left<right?-1:left>right?1:0;}
function scenarioIdentity(result){return result?.scenario_id || `legacy:${result?.scenario || '<unnamed>'}`;}
function checkId(check){return String(check?.id || 'unknown_check');}
function dimensionForInvariant(id){return RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS[id] || 'recovery_correctness';}

function dimensionForCheck(check,result){
  const id=checkId(check);
  if(['duplicate_effect_resistance','duplicate-effect-prevention','one_use_authority'].includes(id))return 'duplicate_effect_resistance';
  if(['revocation_compliance','revocation-compliance'].includes(id))return 'revocation_compliance';
  if(['ambiguity_preservation','eventual_consistency_handling','ambiguous-failure-recovery'].includes(id))return 'ambiguity_handling';
  if(['retry_boundedness','retry-boundedness','attempt-ceiling'].includes(id))return 'retry_boundedness';
  if(['evidence_completeness','evidence_expectation','recorder-completeness'].includes(id))return 'evidence_completeness';
  if(id==='authority_behavior'&&result?.taxonomy?.failure_class==='revocation_race')return 'revocation_compliance';
  if(id==='effect_count_range'&&Number(check?.actual)>Number(check?.expected?.max))return 'duplicate_effect_resistance';
  return 'recovery_correctness';
}

function normalizeCheck(check,result){
  return {
    scenario_id:scenarioIdentity(result),
    scenario:String(result?.scenario || scenarioIdentity(result)),
    result_version:String(result?.result_version || 'unknown'),
    failure_class:result?.taxonomy?.failure_class || null,
    check_id:checkId(check),
    pass:Boolean(check?.pass),
    expected:clone(check?.expected ?? null),
    actual:clone(check?.actual ?? null),
    ...(check?.note?{note:String(check.note)}:{})
  };
}

function normalizeScenarioResult(result){
  if(!result||typeof result!=='object')throw new Error('Reliability scorecard requires CrashLab result objects');
  const checks=Array.isArray(result.checks)?result.checks:[];
  const id=scenarioIdentity(result);
  return {
    scenario_id:id,
    scenario:String(result.scenario || id),
    result_version:String(result.result_version || 'unknown'),
    failure_class:result?.taxonomy?.failure_class || null,
    status:result.status==='PASS'?'PASS':'FAIL',
    attempts:Number.isFinite(Number(result.attempts))?Number(result.attempts):null,
    effect_count:Number.isFinite(Number(result.effect_count))?Number(result.effect_count):null,
    failed_checks:checks.filter(check=>!check?.pass).map(check=>checkId(check)).sort(compareText)
  };
}

export function buildReliabilityScorecard(results=[]){
  if(!Array.isArray(results)||results.length===0)throw new Error('Reliability scorecard requires at least one CrashLab result');
  const sorted=[...results].sort((a,b)=>compareText(scenarioIdentity(a),scenarioIdentity(b))||compareText(a?.scenario,b?.scenario));
  const seen=new Set();
  for(const result of sorted){const id=scenarioIdentity(result);if(seen.has(id))throw new Error(`Reliability scorecard duplicate scenario identity: ${id}`);seen.add(id);}

  const dimensions=Object.fromEntries(RELIABILITY_SCORECARD_DIMENSIONS.map(id=>[id,{status:'NOT_APPLICABLE',applicable_checks:0,passed_checks:0,failed_checks:0,checks:[]}]))
  const scenarios=sorted.map(normalizeScenarioResult);
  const failingInvariants=[];

  for(const result of sorted){
    const id=scenarioIdentity(result);
    const falseInvariants=Object.entries(result?.invariants||{}).filter(([,pass])=>pass===false).map(([invariant])=>invariant);
    const checks=Array.isArray(result?.checks)?result.checks:[];
    const checkIds=new Set();
    for(const check of checks){
      const dimension=dimensionForCheck(check,result);
      const normalized=normalizeCheck(check,result);
      checkIds.add(normalized.check_id);
      dimensions[dimension].checks.push(normalized);
    }
    for(const invariant of falseInvariants){
      const dimension=dimensionForInvariant(invariant);
      failingInvariants.push({scenario_id:id,invariant,dimension});
      if(!checkIds.has(invariant))dimensions[dimension].checks.push({
        scenario_id:id,scenario:String(result?.scenario||id),result_version:String(result?.result_version||'unknown'),failure_class:result?.taxonomy?.failure_class||null,
        check_id:invariant,pass:false,expected:true,actual:false,note:'derived from explicit CrashLab invariant result; matching check record was absent'
      });
    }
    if(result?.status!=='PASS'&&!checks.some(check=>!check?.pass)&&falseInvariants.length===0){
      dimensions.recovery_correctness.checks.push({
        scenario_id:id,scenario:String(result?.scenario||id),result_version:String(result?.result_version||'unknown'),failure_class:result?.taxonomy?.failure_class||null,
        check_id:'scenario_status',pass:false,expected:'PASS',actual:String(result?.status||'FAIL')
      });
    }
  }

  for(const id of RELIABILITY_SCORECARD_DIMENSIONS){
    const dimension=dimensions[id];
    dimension.checks.sort((a,b)=>compareText(a.scenario_id,b.scenario_id)||compareText(a.check_id,b.check_id));
    dimension.applicable_checks=dimension.checks.length;
    dimension.passed_checks=dimension.checks.filter(check=>check.pass).length;
    dimension.failed_checks=dimension.checks.filter(check=>!check.pass).length;
    dimension.status=dimension.applicable_checks===0?'NOT_APPLICABLE':dimension.failed_checks>0?'FAIL':'PASS';
  }
  failingInvariants.sort((a,b)=>compareText(a.scenario_id,b.scenario_id)||compareText(a.invariant,b.invariant));

  const scenarioPass=scenarios.filter(s=>s.status==='PASS').length;
  const dimensionValues=RELIABILITY_SCORECARD_DIMENSIONS.map(id=>dimensions[id]);
  const status=scenarioPass===scenarios.length&&dimensionValues.every(d=>d.status!=='FAIL')?'PASS':'FAIL';
  return {
    scorecard_version:RELIABILITY_SCORECARD_VERSION,
    ruleoak_version:CORE_VERSION,
    report_kind:'ruleoak.crashlab.reliability_scorecard',
    status,
    summary:{
      scenarios:{total:scenarios.length,pass:scenarioPass,fail:scenarios.length-scenarioPass},
      dimensions:{pass:dimensionValues.filter(d=>d.status==='PASS').length,fail:dimensionValues.filter(d=>d.status==='FAIL').length,not_applicable:dimensionValues.filter(d=>d.status==='NOT_APPLICABLE').length}
    },
    dimensions,
    failing_invariants:failingInvariants,
    scenarios
  };
}

export function reliabilityScorecardExitCode(scorecard){return scorecard?.status==='PASS'?RELIABILITY_CI_EXIT_CODES.PASS:RELIABILITY_CI_EXIT_CODES.FAIL;}
export function serializeReliabilityScorecardJson(scorecard){return `${JSON.stringify(scorecard,null,2)}\n`;}

function renderValue(value){return typeof value==='string'?value:JSON.stringify(value);}
export function renderReliabilityScorecardSummary(scorecard){
  const lines=[
    `RuleOak Reliability Scorecard v${scorecard.scorecard_version} · RuleOak ${scorecard.ruleoak_version}`,
    `Result: ${scorecard.status}`,
    `Scenarios: ${scorecard.summary.scenarios.pass} PASS / ${scorecard.summary.scenarios.fail} FAIL / ${scorecard.summary.scenarios.total} total`,
    ''
  ];
  for(const id of RELIABILITY_SCORECARD_DIMENSIONS){
    const d=scorecard.dimensions[id];
    lines.push(`${d.status.padEnd(14)} ${id} · ${d.passed_checks}/${d.applicable_checks} checks passed`);
    for(const check of d.checks.filter(item=>!item.pass))lines.push(`  FAIL ${check.scenario_id} · ${check.check_id} · actual ${renderValue(check.actual)} · expected ${renderValue(check.expected)}`);
  }
  if(scorecard.failing_invariants.length){lines.push('',`Failing invariants: ${scorecard.failing_invariants.map(x=>`${x.scenario_id}:${x.invariant}`).join(', ')}`);}
  return `${lines.join('\n')}\n`;
}

function xmlEscape(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
export function serializeReliabilityScorecardJUnit(scorecard){
  const dimensions=RELIABILITY_SCORECARD_DIMENSIONS.map(id=>[id,scorecard.dimensions[id]]);
  const failures=dimensions.filter(([,d])=>d.status==='FAIL').length;
  const skipped=dimensions.filter(([,d])=>d.status==='NOT_APPLICABLE').length;
  const lines=['<?xml version="1.0" encoding="UTF-8"?>',`<testsuite name="RuleOak Reliability Scorecard" tests="${dimensions.length}" failures="${failures}" skipped="${skipped}">`,'  <properties>',`    <property name="scorecard_version" value="${xmlEscape(scorecard.scorecard_version)}"/>`,`    <property name="ruleoak_version" value="${xmlEscape(scorecard.ruleoak_version)}"/>`,`    <property name="scenario_count" value="${scorecard.summary.scenarios.total}"/>`,'  </properties>'];
  for(const [id,d] of dimensions){
    lines.push(`  <testcase classname="ruleoak.reliability" name="${xmlEscape(id)}">`);
    if(d.status==='NOT_APPLICABLE')lines.push('    <skipped message="No applicable CrashLab checks"/>');
    else if(d.status==='FAIL'){
      const body=d.checks.filter(check=>!check.pass).map(check=>`${check.scenario_id}:${check.check_id} actual=${renderValue(check.actual)} expected=${renderValue(check.expected)}`).join('\n');
      lines.push(`    <failure message="${d.failed_checks} reliability check(s) failed">${xmlEscape(body)}</failure>`);
    }
    lines.push('  </testcase>');
  }
  lines.push('</testsuite>');
  return `${lines.join('\n')}\n`;
}

export function buildReliabilityScorecardSarif(scorecard){
  const rules=RELIABILITY_SCORECARD_DIMENSIONS.map(id=>({id,name:id,shortDescription:{text:`RuleOak reliability dimension: ${id}`}}));
  const results=[];
  for(const id of RELIABILITY_SCORECARD_DIMENSIONS){
    for(const check of scorecard.dimensions[id].checks.filter(item=>!item.pass))results.push({
      ruleId:id,
      level:'error',
      message:{text:`${check.scenario_id}: ${check.check_id} failed`},
      properties:{scenario_id:check.scenario_id,scenario:check.scenario,check_id:check.check_id,failure_class:check.failure_class,expected:check.expected,actual:check.actual}
    });
  }
  return {$schema:'https://json.schemastore.org/sarif-2.1.0.json',version:'2.1.0',runs:[{tool:{driver:{name:'RuleOak CrashLab',semanticVersion:scorecard.ruleoak_version,rules}},properties:{scorecard_version:scorecard.scorecard_version,scorecard_status:scorecard.status},results}]};
}
export function serializeReliabilityScorecardSarif(scorecard){return `${JSON.stringify(buildReliabilityScorecardSarif(scorecard),null,2)}\n`;}
