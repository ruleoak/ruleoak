/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  buildAuthorityGrant, evaluatePermissionRequest, buildExecutionLease,
  CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES, runCrashScenario
} from '../src/index.js';
import { CRASHLAB_FAILURE_CLASSES, validateCrashLabScenario } from '@ruleoak/protocol';

const sha=(c)=>`sha256:${c.repeat(64)}`;
const base={
  scenario_version:'2.1',scenario_id:'reliability.base',name:'reliability base',
  target:{adapter_id:'synthetic-target',domain:'generic',action:'resource.write',resource:'synthetic://x',idempotency:'required',idempotency_key:'x'},
  authority:{initial_state:'valid'},
  fault:{phase:'before_effect',class:'token_expiry',on_attempt:1,repeat:'once'},
  retry:{max_attempts:1,strategy:'none',preserve_idempotency_key:true},
  expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['retry_boundedness','authority_containment','evidence_completeness','recovery_correctness']}
};
assert.equal(validateCrashLabScenario(base).valid,true);
const token=await runCrashScenario(base);assert.equal(token.status,'PASS');assert.equal(token.result_version,'2.1');assert.equal(token.effect_count,0);

const concurrent={...base,scenario_id:'reliability.concurrent.one-use',name:'Concurrent actors share one-use authority',fault:{phase:'before_effect',class:'concurrent_race',on_attempt:1,repeat:'once'},concurrency:{actors:3,schedule:'deterministic_barrier',shared_authority:'one_use'},expect:{effect_count:{min:1,max:1},authority_behavior:'one_winner',evidence:{quality:'local_state_observed',status:'success',ambiguity:'none'},invariants:['one_use_authority','authority_containment','duplicate_effect_resistance','recovery_correctness']}};
assert.equal(validateCrashLabScenario(concurrent).valid,true);
const race=await runCrashScenario(concurrent);assert.equal(race.status,'PASS');assert.equal(race.effect_count,1);assert.equal(race.authority_denials,0);assert.equal(race.invariants.one_use_authority,true);assert.equal(race.trace.filter(x=>x.stage==='authorization.checked'&&x.ok===true).length,3,'all contenders must be pre-authorized before the deterministic one-use consumption barrier');assert.equal(race.trace.filter(x=>x.stage==='lease.consumed').length,1);assert.equal(race.trace.filter(x=>x.stage==='lease.replayed').length,2,'later consumers must be represented as replay denials rather than authorization denials');

const revoked={...base,scenario_id:'reliability.concurrent.revocation',name:'Revocation during concurrent schedule',authority:{initial_state:'valid',revoke_on_attempt:2},fault:{phase:'before_effect',class:'revocation_race',on_attempt:1,repeat:'once'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:true},concurrency:{actors:3,schedule:'deterministic_barrier',shared_authority:'revocable'},expect:{effect_count:{min:1,max:1},authority_behavior:'deny_after_revoke',evidence:{quality:'local_state_observed',status:'success',ambiguity:'none'},invariants:['revocation_compliance','authority_containment','duplicate_effect_resistance','recovery_correctness']}};
assert.equal(validateCrashLabScenario(revoked).valid,true);
const revokeResult=await runCrashScenario(revoked);assert.equal(revokeResult.status,'PASS');assert.equal(revokeResult.effect_count,1);assert.equal(revokeResult.authority_denials,2);assert.equal(revokeResult.invariants.revocation_compliance,true);

function staleScenario(cls,key,a,b){return {...base,scenario_id:`reliability.${cls}`,name:`Reject ${cls}`,fault:{phase:'before_effect',class:cls,on_attempt:1,repeat:'once'},state:{[key]:{expected:sha(a),current:sha(b)}},expect:{effect_count:{min:0,max:0},authority_behavior:'allow',evidence:{quality:'requested_only',status:'unknown',ambiguity:'none'},invariants:['stale_state_rejection','authority_containment','recovery_correctness']}};}
for(const [cls,key,a,b] of [['stale_capability','capability','a','b'],['stale_policy','policy','c','d'],['stale_approved_baseline','approved_baseline','e','f']]){
  const scenario=staleScenario(cls,key,a,b);assert.equal(validateCrashLabScenario(scenario).valid,true,cls);const result=await runCrashScenario(scenario);assert.equal(result.status,'PASS',cls);assert.equal(result.effect_count,0);assert.equal(result.invariants.stale_state_rejection,true);
}

const eventual={...base,scenario_id:'reliability.eventual-consistency',name:'Effect temporarily invisible then converges',fault:{phase:'after_effect_before_response',class:'eventual_consistency',on_attempt:1,repeat:'once'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:true},state:{consistency:{visible_on_attempt:2}},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['eventual_consistency_handling','ambiguity_preservation','duplicate_effect_resistance','recovery_correctness']}};
assert.equal(validateCrashLabScenario(eventual).valid,true);
const converged=await runCrashScenario(eventual);assert.equal(converged.status,'PASS');assert.equal(converged.effect_count,1);assert.equal(converged.ambiguous_failures,1);assert.equal(converged.invariants.eventual_consistency_handling,true);

// Contract rejects missing or contradictory concurrency/staleness controls.
assert.equal(validateCrashLabScenario({...concurrent,concurrency:undefined}).valid,false);
assert.equal(validateCrashLabScenario({...concurrent,concurrency:{...concurrent.concurrency,shared_authority:'revocable'}}).valid,false);
assert.equal(validateCrashLabScenario({...eventual,state:{consistency:{visible_on_attempt:3}}}).valid,false);
assert.equal(validateCrashLabScenario(staleScenario('stale_policy','policy','a','a')).valid,false);

for(const cls of CRASHLAB_FAILURE_CLASSES)assert.ok(CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES.includes(cls),`formal failure class ${cls} must be executable`);

// Every formal failure class has an executable v2.1 regression, not just a coverage-matrix declaration.
for(const cls of ['timeout','transport_failure','local_process_crash','synthetic_error']){
  const scenario={...base,scenario_id:`reliability.coverage.${cls}`,fault:{phase:'before_effect',class:cls,on_attempt:1,repeat:'once'}};
  assert.equal(validateCrashLabScenario(scenario).valid,true,cls);assert.equal((await runCrashScenario(scenario)).status,'PASS',cls);
}
for(const cls of ['response_loss','duplicate_retry']){
  const scenario={...base,scenario_id:`reliability.coverage.${cls}`,fault:{phase:'after_effect_before_response',class:cls,on_attempt:1,repeat:'once'},retry:{max_attempts:2,strategy:'immediate',preserve_idempotency_key:true},expect:{effect_count:{min:1,max:1},authority_behavior:'allow',evidence:{quality:'local_state_observed',status:'success',ambiguity:'preserve'},invariants:['duplicate_effect_resistance','retry_boundedness','ambiguity_preservation','recovery_correctness']}};
  assert.equal(validateCrashLabScenario(scenario).valid,true,cls);assert.equal((await runCrashScenario(scenario)).status,'PASS',cls);
}

// Production one-use lease store race: two processes compete for the same real ExecutionLease marker.
const now='2099-01-01T00:00:00.000Z', secret='v047-one-use-race';
const grant=buildAuthorityGrant({issuer:'user:owner',subject:{type:'agent',id:'agent-race'},principal_chain:[{type:'agent',id:'agent-race'}],capabilities:[{actions:['resource.write'],resources:['ruleoak://file/project/**']}],not_before:now,expires_at:'2099-01-01T01:00:00.000Z'},{secret,issuedAt:now});
const call={call_id:'race-call',timestamp:now,actor:{type:'agent',id:'agent-race',name:'agent-race',session_id:'s'},tool:{name:'filesystem.write',category:'file',operation:'write'},target:{resource:'project/x.txt',scope:'local',sensitivity:'internal'},arguments:{},context:{}};
const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['project/**']}]};
const permission=evaluatePermissionRequest(call,policy,{authorityGrant:grant,authoritySecret:secret,evaluatedAt:now});
const lease=buildExecutionLease(permission,policy,{secret,issuedAt:now,ttlMs:60000,authorityGrant:grant});
const dir=mkdtempSync(join(tmpdir(),'ruleoak-v047-lease-race-'));const store=join(dir,'store');
writeFileSync(join(dir,'lease.json'),JSON.stringify(lease));writeFileSync(join(dir,'call.json'),JSON.stringify(call));writeFileSync(join(dir,'policy.json'),JSON.stringify(policy));
const coreUrl=new URL('../src/index.js',import.meta.url).href;
const worker=`import fs from 'node:fs';import {consumeExecutionLease} from ${JSON.stringify(coreUrl)};const d=process.argv[1],secret=process.argv[2],now=process.argv[3],id=process.argv[4];fs.writeFileSync(d+'/ready-'+id,'ready');while(!fs.existsSync(d+'/go'))await new Promise(r=>setTimeout(r,2));const lease=JSON.parse(fs.readFileSync(d+'/lease.json'));const call=JSON.parse(fs.readFileSync(d+'/call.json'));const policy=JSON.parse(fs.readFileSync(d+'/policy.json'));const r=consumeExecutionLease(lease,call,policy,{secret,now,storeDir:d+'/store'});console.log(JSON.stringify({ok:r.ok,consumed:r.consumed,replayed:r.replayed}));`;
function spawnWorker(id){let out='',err='';const child=spawn(process.execPath,['--input-type=module','-e',worker,dir,secret,now,String(id)],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);const result=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{if(code!==0)return reject(new Error(err||`worker ${code}`));try{resolve(JSON.parse(out.trim()))}catch(e){reject(new Error(`bad worker output ${out}: ${e.message}`));}});});return {child,result};}
async function waitForReady(){for(let i=0;i<500;i+=1){if(existsSync(join(dir,'ready-1'))&&existsSync(join(dir,'ready-2')))return;await new Promise(r=>setTimeout(r,2));}throw new Error('cross-process one-use workers did not reach the shared readiness barrier');}
try{const first=spawnWorker(1),second=spawnWorker(2);await waitForReady();writeFileSync(join(dir,'go'),'go');const realRace=await Promise.all([first.result,second.result]);assert.equal(realRace.filter(x=>x.ok&&x.consumed).length,1);assert.equal(realRace.filter(x=>x.replayed).length,1);}finally{rmSync(dir,{recursive:true,force:true});}

console.log('Concurrency & Staleness tests passed');
