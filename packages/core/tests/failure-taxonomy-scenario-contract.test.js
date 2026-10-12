/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { CRASHLAB_FAILURE_CLASSES, validateCrashLabScenario } from '@ruleoak/protocol';
import { CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES, runCrashScenario, validateCrashScenario } from '../src/index.js';

const base={
  scenario_version:'2.0',scenario_id:'generic.response-loss.idempotent',name:'Response lost after effect',
  target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.create',resource:'synthetic://x',idempotency:'required',idempotency_key:'create-x'},
  authority:{initial_state:'valid'},
  fault:{phase:'after_effect_before_response',class:'response_loss',on_attempt:1,repeat:'once'},
  retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:true},
  expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['duplicate_effect_resistance','retry_boundedness','authority_containment','ambiguity_preservation','evidence_completeness','recovery_correctness']}
};
assert.equal(validateCrashLabScenario(base).valid,true);
assert.equal(validateCrashScenario(base).valid,true);
const good=await runCrashScenario(base);
assert.equal(good.result_version,'2.0');assert.equal(good.status,'PASS');assert.equal(good.effect_count,1);assert.equal(good.taxonomy.failure_class,'response_loss');assert.equal(good.evidence.quality,'local_state_observed');assert.equal(good.invariants.duplicate_effect_resistance,true);

const duplicate={...base,scenario_id:'generic.duplicate.non-idempotent',target:{...base.target,idempotency:'supported'},retry:{...base.retry,preserve_idempotency_key:false},expect:{...base.expect,effect_count:{min:1,max:1}}};
const bad=await runCrashScenario(duplicate);assert.equal(bad.status,'FAIL');assert.equal(bad.effect_count,2);assert.equal(bad.invariants.duplicate_effect_resistance,false);

const revoked={...base,scenario_id:'generic.revoked.retry',authority:{initial_state:'valid',revoke_on_attempt:2},expect:{...base.expect,authority_behavior:'deny_after_revoke',invariants:['retry_boundedness','authority_containment','revocation_compliance','ambiguity_preservation','evidence_completeness','recovery_correctness']}};
const rev=await runCrashScenario(revoked);assert.equal(rev.status,'PASS');assert.equal(rev.authority_denials,1);assert.equal(rev.invariants.revocation_compliance,true);

const before={...base,scenario_id:'generic.timeout.before-effect',target:{...base.target,idempotency:'none',idempotency_key:null},fault:{phase:'before_effect',class:'timeout',on_attempt:1,repeat:'every_attempt'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:false},expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['duplicate_effect_resistance','retry_boundedness','authority_containment','evidence_completeness','recovery_correctness']}};
const pre=await runCrashScenario(before);assert.equal(pre.status,'PASS');assert.equal(pre.effect_count,0);assert.equal(pre.evidence.quality,'requested_only');


const partial={...base,scenario_id:'generic.partial-effect',fault:{phase:'partial_effect',class:'timeout',on_attempt:1,repeat:'once'},retry:{max_attempts:1,strategy:'none',preserve_idempotency_key:true},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'partial',status:'partial',ambiguity:'preserve'},invariants:['retry_boundedness','authority_containment','ambiguity_preservation','evidence_completeness','recovery_correctness']}};
const partialResult=await runCrashScenario(partial);assert.equal(partialResult.status,'PASS');assert.equal(partialResult.evidence.quality,'partial');assert.equal(partialResult.trace.some(e=>e.stage==='effect.partial_observed'),true);
await assert.rejects(()=>runCrashScenario(partial,{target:{effects:[],apply(){return {effect_applied:true,effect_count:1}}}}),/applyPartial/);

const beforeAuthAllow={...before,scenario_id:'generic.before-auth.allow-is-not-observed',fault:{phase:'before_authorization',class:'timeout',on_attempt:1,repeat:'every_attempt'},expect:{...before.expect,authority_behavior:'allow'}};
const beforeAuthResult=await runCrashScenario(beforeAuthAllow);assert.equal(beforeAuthResult.status,'FAIL');assert.equal(beforeAuthResult.checks.find(c=>c.id==='authority_behavior').actual,'not_checked');

const future={...base,scenario_id:'generic.concurrent.future',fault:{...base.fault,class:'concurrent_race'}};
assert.equal(validateCrashLabScenario(future).valid,true);assert.ok(CRASHLAB_FAILURE_CLASSES.includes('concurrent_race'));assert.ok(CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES.includes('concurrent_race'));
await assert.rejects(()=>runCrashScenario(future),/requires Scenario v2.1 execution semantics/);

const stale={...base,scenario_id:'generic.stale.future',fault:{...base.fault,phase:'before_effect',class:'stale_policy'}};
assert.equal(validateCrashLabScenario(stale).valid,true);await assert.rejects(()=>runCrashScenario(stale),/requires Scenario v2.1 execution semantics/);

assert.equal(validateCrashLabScenario({...base,retry:{...base.retry,strategy:'none',max_attempts:2}}).valid,false);
assert.equal(validateCrashLabScenario({...base,target:{...base.target,idempotency:'required'},retry:{...base.retry,preserve_idempotency_key:false}}).valid,false);
assert.equal(validateCrashLabScenario({...base,expect:{...base.expect,invariants:['retry_boundedness','retry_boundedness']}}).valid,false);
assert.equal(validateCrashLabScenario({...base,fault:{...base.fault,class:'made_up'}}).valid,false);


assert.equal(validateCrashLabScenario({...base,fault:{...base.fault,phase:'before_authorization',class:'response_loss'}}).valid,false);
assert.equal(validateCrashLabScenario({...base,fault:{...base.fault,on_attempt:3},retry:{...base.retry,max_attempts:2}}).valid,false);
assert.equal(validateCrashLabScenario({...base,authority:{initial_state:'valid'},expect:{...base.expect,authority_behavior:'deny_after_revoke'}}).valid,false);
assert.equal(validateCrashLabScenario({...base,authority:{initial_state:'denied'},expect:{...base.expect,authority_behavior:'allow'}}).valid,false);

const legacy={scenario_version:'1.1',name:'legacy',target:{action:'resource.create'},fault:{point:'before_effect',type:'timeout'},agent:{max_attempts:1},expect:{max_effect_count:0}};
assert.equal(validateCrashLabScenario(legacy).valid,true);assert.equal((await runCrashScenario(legacy)).result_version,'1.1');
console.log('Failure Taxonomy & Scenario Contract tests passed');
