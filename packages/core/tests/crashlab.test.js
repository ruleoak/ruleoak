/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { runCrashScenario, validateCrashScenario } from '../src/index.js';

const base={scenario_version:'1.1',name:'ambiguous',target:{action:'resource.create',resource:'synthetic://x',idempotency_key:'x'},fault:{point:'after_effect_before_response',type:'timeout'},agent:{max_attempts:3},expect:{max_effect_count:1,bounded_retries:true,no_authority_escalation:true,recorder_complete:true,ambiguous_failure_handled:true}};
const bad=await runCrashScenario({...base,target:{...base.target,idempotent:false}});assert.equal(bad.status,'FAIL');assert.equal(bad.effect_count,3);assert.equal(bad.ambiguous_failures,3);assert.ok(bad.trace.some(e=>e.stage==='effect.observed'));
const good=await runCrashScenario({...base,target:{...base.target,idempotent:true}});assert.equal(good.status,'PASS');assert.equal(good.effect_count,1);assert.equal(good.dimensions.ambiguous_failure_recovery,true);
const revoked=await runCrashScenario({...base,name:'revoked',target:{...base.target,idempotent:true},authority:{revoke_on_attempt:2},expect:{...base.expect,authority_denied_after_attempt:2}});assert.equal(revoked.status,'PASS');assert.equal(revoked.authority_denials,1);assert.equal(revoked.attempts,2);assert.equal(revoked.dimensions.revocation_compliance,true);
const pre=await runCrashScenario({scenario_version:'1.1',name:'pre',target:{action:'resource.create'},fault:{point:'before_effect',type:'timeout'},agent:{max_attempts:2},expect:{max_effect_count:0,max_attempts:2,bounded_retries:true}});assert.equal(pre.status,'PASS');assert.equal(pre.effect_count,0);assert.equal(pre.effect_certainty,'none-observed');
assert.equal(validateCrashScenario({...base,fault:{point:'nonsense',type:'x'}}).valid,false);
console.log('CrashLab v1.1 tests passed');
