/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCrashScenarioFile, renderCrashResult } from '../src/crashlab.js';
const dir=mkdtempSync(join(tmpdir(),'ruleoak-crashlab-v2-'));
const file=join(dir,'scenario.json');
const scenario={scenario_version:'2.0',scenario_id:'cli.timeout.before-effect',name:'CLI timeout before effect',target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.create',resource:'synthetic://x',idempotency:'none'},authority:{initial_state:'valid'},fault:{phase:'before_effect',class:'timeout',on_attempt:1,repeat:'every_attempt'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:false},expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['duplicate_effect_resistance','retry_boundedness','authority_containment','evidence_completeness','recovery_correctness']}};
writeFileSync(file,JSON.stringify(scenario));
const result=await runCrashScenarioFile(file);assert.equal(result.status,'PASS');assert.equal(result.result_version,'2.0');assert.equal(result.taxonomy.failure_class,'timeout');
const rendered=renderCrashResult(result);assert.match(rendered,/CrashLab: CLI timeout before effect/);assert.match(rendered,/Result: PASS/);

const concurrentFile=join(dir,'concurrent.json');
const concurrent={scenario_version:'2.1',scenario_id:'cli.concurrent.one-use',name:'CLI concurrent one-use authority',target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.write',resource:'synthetic://x',idempotency:'required',idempotency_key:'x'},authority:{initial_state:'valid'},fault:{phase:'before_effect',class:'concurrent_race',on_attempt:1,repeat:'once'},retry:{max_attempts:1,strategy:'none',preserve_idempotency_key:true},concurrency:{actors:2,schedule:'deterministic_barrier',shared_authority:'one_use'},expect:{effect_count:{min:1,max:1},authority_behavior:'one_winner',evidence:{quality:'local_state_observed',status:'success',ambiguity:'none'},invariants:['one_use_authority','authority_containment','recovery_correctness']}};
writeFileSync(concurrentFile,JSON.stringify(concurrent));const concurrentResult=await runCrashScenarioFile(concurrentFile);assert.equal(concurrentResult.status,'PASS');assert.equal(concurrentResult.result_version,'2.1');assert.equal(concurrentResult.authority_denials,0);assert.equal(concurrentResult.trace.filter(x=>x.stage==='authorization.checked'&&x.ok===true).length,2);assert.equal(concurrentResult.trace.filter(x=>x.stage==='lease.consumed').length,1);assert.equal(concurrentResult.trace.filter(x=>x.stage==='lease.replayed').length,1);assert.match(renderCrashResult(concurrentResult),/Observed effects: 1/);

console.log('CrashLab Scenario Contract CLI tests passed');
