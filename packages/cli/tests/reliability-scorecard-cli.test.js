/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { discoverCrashScenarioFiles, runCrashScorecardFiles, renderCrashScorecard, reliabilityScorecardExitCode } from '../src/crashlab.js';

const dir=mkdtempSync(join(tmpdir(),'ruleoak-v048-scorecard-')),nested=join(dir,'nested');mkdirSync(nested);
const base={scenario_version:'2.0',target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.create',resource:'synthetic://x',idempotency:'none'},authority:{initial_state:'valid'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:false}};
const passing={...base,scenario_id:'cli.scorecard.pass',name:'CLI bounded timeout',fault:{phase:'before_effect',class:'timeout',on_attempt:1,repeat:'every_attempt'},expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['duplicate_effect_resistance','retry_boundedness','authority_containment','evidence_completeness','recovery_correctness']}};
const failing={...base,scenario_id:'cli.scorecard.fail',name:'CLI duplicate response-loss effect',fault:{phase:'after_effect_before_response',class:'response_loss',on_attempt:1,repeat:'once'},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['duplicate_effect_resistance','retry_boundedness','ambiguity_preservation','evidence_completeness','recovery_correctness']}};
const passFile=join(dir,'pass.json'),failFile=join(nested,'fail.json');writeFileSync(passFile,JSON.stringify(passing));writeFileSync(failFile,JSON.stringify(failing));
assert.deepEqual(discoverCrashScenarioFiles(dir),[failFile,passFile].sort());
const scorecard=await runCrashScorecardFiles([failFile,passFile]);
assert.equal(scorecard.status,'FAIL');assert.equal(reliabilityScorecardExitCode(scorecard),2);
for(const format of ['human','json','junit','sarif'])assert.ok(renderCrashScorecard(scorecard,format).length>20,format);
assert.throws(()=>renderCrashScorecard(scorecard,'invented'),/human, json, junit, or sarif/);

const bin=new URL('../bin/ruleoak.js',import.meta.url);
const passRun=spawnSync(process.execPath,[bin.pathname,'crashlab','scorecard','--scenario',passFile,'--format','json'],{encoding:'utf8'});
assert.equal(passRun.status,0,passRun.stderr);assert.equal(JSON.parse(passRun.stdout).status,'PASS');
const failRun=spawnSync(process.execPath,[bin.pathname,'crashlab','scorecard','--scenario-dir',dir,'--format','sarif'],{encoding:'utf8'});
assert.equal(failRun.status,2,failRun.stderr);const sarif=JSON.parse(failRun.stdout);assert.equal(sarif.version,'2.1.0');assert.ok(sarif.runs[0].results.some(x=>x.ruleId==='duplicate_effect_resistance'));assert.equal(JSON.stringify(sarif).includes('locations'),false);
console.log('Reliability Scorecard & CI CLI tests passed');
