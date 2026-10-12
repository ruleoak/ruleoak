/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RELIABILITY_SCORECARD_VERSION,
  RELIABILITY_SCORECARD_DIMENSIONS,
  buildReliabilityScorecard,
  buildReliabilityScorecardSarif,
  serializeReliabilityScorecardJson,
  serializeReliabilityScorecardJUnit,
  renderReliabilityScorecardSummary,
  reliabilityScorecardExitCode,
  runCrashScenario
} from '../src/index.js';

const base={scenario_version:'2.0',target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.create',resource:'synthetic://x',idempotency:'none'},authority:{initial_state:'valid'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:false}};
const passing={...base,scenario_id:'scorecard.pass.timeout',name:'Bounded pre-effect timeout',fault:{phase:'before_effect',class:'timeout',on_attempt:1,repeat:'every_attempt'},expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['duplicate_effect_resistance','retry_boundedness','authority_containment','evidence_completeness','recovery_correctness']}};
const duplicateFailure={...base,scenario_id:'scorecard.fail.duplicate',name:'Duplicate effect after response loss',fault:{phase:'after_effect_before_response',class:'response_loss',on_attempt:1,repeat:'once'},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['duplicate_effect_resistance','retry_boundedness','ambiguity_preservation','evidence_completeness','recovery_correctness']}};

const passResult=await runCrashScenario(passing);
const failResult=await runCrashScenario(duplicateFailure);
assert.equal(passResult.status,'PASS');
assert.equal(failResult.status,'FAIL');
assert.equal(failResult.invariants.duplicate_effect_resistance,false);

const revocationFailure={result_version:'2.1',scenario_id:'scorecard.fail.revocation',scenario:'Revocation compliance failure',taxonomy:{failure_class:'revocation_race'},status:'FAIL',attempts:2,effect_count:1,invariants:{revocation_compliance:false},checks:[{id:'revocation_compliance',pass:false,expected:'no post-revocation effect',actual:{effect_after_revoke:true}}]};
const results=[failResult,revocationFailure,passResult];
const scorecard=buildReliabilityScorecard(results);
const reversed=buildReliabilityScorecard([...results].reverse());

assert.equal(RELIABILITY_SCORECARD_VERSION,'1.0');
assert.deepEqual(RELIABILITY_SCORECARD_DIMENSIONS,[
  'duplicate_effect_resistance','revocation_compliance','ambiguity_handling','retry_boundedness','evidence_completeness','recovery_correctness'
]);
const installedRuleOakVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
assert.equal(scorecard.ruleoak_version,installedRuleOakVersion);
assert.equal(buildReliabilityScorecard(results,{ruleoakVersion:'9.9.9'}).ruleoak_version,installedRuleOakVersion,'report identity must not be caller-overridable');
assert.equal(scorecard.status,'FAIL');
assert.equal(reliabilityScorecardExitCode(scorecard),2);
assert.equal(reliabilityScorecardExitCode(buildReliabilityScorecard([passResult])),0);
assert.equal(Object.hasOwn(scorecard,'score'),false,'scorecard must not expose one opaque safety score');
assert.equal(scorecard.dimensions.duplicate_effect_resistance.status,'FAIL');
assert.equal(scorecard.dimensions.revocation_compliance.status,'FAIL');
assert.equal(scorecard.dimensions.ambiguity_handling.status,'PASS');
assert.equal(scorecard.dimensions.retry_boundedness.status,'PASS');
assert.equal(scorecard.dimensions.evidence_completeness.status,'PASS');
assert.equal(scorecard.dimensions.recovery_correctness.status,'FAIL');
assert.ok(scorecard.failing_invariants.some(x=>x.scenario_id==='scorecard.fail.duplicate'&&x.invariant==='duplicate_effect_resistance'&&x.dimension==='duplicate_effect_resistance'));
assert.ok(scorecard.failing_invariants.some(x=>x.scenario_id==='scorecard.fail.revocation'&&x.invariant==='revocation_compliance'&&x.dimension==='revocation_compliance'));
assert.equal(serializeReliabilityScorecardJson(scorecard),serializeReliabilityScorecardJson(reversed),'JSON output must be stable regardless of input order');
assert.equal(renderReliabilityScorecardSummary(scorecard),renderReliabilityScorecardSummary(reversed),'human output must be stable');
assert.equal(serializeReliabilityScorecardJUnit(scorecard),serializeReliabilityScorecardJUnit(reversed),'JUnit output must be stable');

const junit=serializeReliabilityScorecardJUnit(scorecard);
assert.match(junit,/RuleOak Reliability Scorecard/);
assert.match(junit,new RegExp(`ruleoak_version\" value=\"${installedRuleOakVersion.replace(/\./g,'\\.')}\"`));
assert.doesNotMatch(junit,/\bfile=/i,'JUnit must not invent source files');
assert.doesNotMatch(junit,/\bline=/i,'JUnit must not invent source lines');
assert.doesNotMatch(junit,/timestamp=/i,'JUnit must remain deterministic');

const sarif=buildReliabilityScorecardSarif(scorecard);
assert.equal(sarif.version,'2.1.0');
assert.equal(sarif.runs[0].tool.driver.semanticVersion,installedRuleOakVersion);
assert.ok(sarif.runs[0].results.some(x=>x.ruleId==='duplicate_effect_resistance'));
assert.ok(sarif.runs[0].results.some(x=>x.ruleId==='revocation_compliance'));
for(const finding of sarif.runs[0].results)assert.equal(Object.hasOwn(finding,'locations'),false,'SARIF reliability findings must not fabricate source locations');
assert.equal(JSON.stringify(sarif).includes('physicalLocation'),false);


const invariantOnlyFailure={result_version:'2.1',scenario_id:'scorecard.fail.invariant-only',scenario:'Invariant remains visible without matching check',taxonomy:{failure_class:'synthetic_error'},status:'FAIL',attempts:1,effect_count:0,invariants:{evidence_completeness:false},checks:[{id:'authority_behavior',pass:false,expected:'allow',actual:'not_checked'}]};
const invariantOnlyScorecard=buildReliabilityScorecard([invariantOnlyFailure]);
assert.ok(invariantOnlyScorecard.failing_invariants.some(x=>x.scenario_id==='scorecard.fail.invariant-only'&&x.invariant==='evidence_completeness'&&x.dimension==='evidence_completeness'),'false invariants must remain visible even when no same-id check exists');
assert.equal(invariantOnlyScorecard.dimensions.evidence_completeness.status,'FAIL');
assert.ok(invariantOnlyScorecard.dimensions.evidence_completeness.checks.some(x=>x.check_id==='evidence_completeness'&&x.pass===false&&x.note?.includes('derived from explicit CrashLab invariant result')));

assert.throws(()=>buildReliabilityScorecard([]),/at least one/);
assert.throws(()=>buildReliabilityScorecard([passResult,passResult]),/duplicate scenario identity/);
console.log('Reliability Scorecard & CI core tests passed');
