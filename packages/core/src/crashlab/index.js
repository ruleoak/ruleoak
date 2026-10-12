/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {
  CRASHLAB_FAILURE_CLASSES,
  CRASHLAB_INVARIANTS,
  validateCrashLabScenario
} from '@ruleoak/protocol';

function clone(v){return JSON.parse(JSON.stringify(v));}

export const CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES = [
  'timeout',
  'response_loss',
  'token_expiry',
  'revocation_race',
  'concurrent_race',
  'stale_capability',
  'stale_policy',
  'stale_approved_baseline',
  'eventual_consistency',
  'transport_failure',
  'local_process_crash',
  'duplicate_retry',
  'synthetic_error'
];

export function validateCrashScenario(scenario={}){
  const result=validateCrashLabScenario(scenario);
  return {valid:result.valid,errors:[...result.errors]};
}

export class SyntheticEffectTarget{
  constructor(options={}){this.idempotent=Boolean(options.idempotent);this.effects=[];this.keys=new Set();}
  apply(request={}){const key=request.idempotency_key||null;if(this.idempotent&&key&&this.keys.has(key))return{effect_applied:false,duplicate_suppressed:true,effect_count:this.effects.length};if(key)this.keys.add(key);this.effects.push(clone(request));return{effect_applied:true,duplicate_suppressed:false,effect_count:this.effects.length};}
  applyPartial(request={}){const key=request.idempotency_key||null;if(this.idempotent&&key&&this.keys.has(key))return{effect_applied:false,duplicate_suppressed:true,partial:true,effect_count:this.effects.length};if(key)this.keys.add(key);this.effects.push({...clone(request),__crashlab_partial:true});return{effect_applied:true,duplicate_suppressed:false,partial:true,effect_count:this.effects.length};}
}

function tracePush(trace,attempt,stage,extra={}){trace.push({attempt,stage,...extra});}
function legacyFaultAt(s,point){return s.fault?.point===point;}

async function runLegacyCrashScenario(scenario,options={}){
  const target=options.target||new SyntheticEffectTarget({idempotent:scenario.target?.idempotent});
  const maxAttempts=Math.max(1,Number(scenario.agent?.max_attempts||2));
  const request={action:scenario.target.action,resource:scenario.target.resource||'synthetic://target',idempotency_key:scenario.target.idempotency_key||null};
  let attempts=0,responses=0,authorityDenials=0,ambiguousFailures=0;const errors=[],trace=[];
  while(attempts<maxAttempts){
    attempts+=1;
    try{
      tracePush(trace,attempts,'attempt.started');
      if(legacyFaultAt(scenario,'before_authorization'))throw new Error(scenario.fault.type);
      const revoked=scenario.authority?.revoke_on_attempt&&attempts>=scenario.authority.revoke_on_attempt;
      const auth=revoked?{ok:false,reason:'synthetic authority revoked'}:options.authorize?await options.authorize({attempt:attempts,request,scenario}):{ok:true,reason:'synthetic authority allowed'};
      tracePush(trace,attempts,'authorization.checked',{ok:Boolean(auth?.ok),reason:auth?.reason||null});
      if(!auth?.ok){authorityDenials+=1;errors.push({attempt:attempts,message:auth?.reason||'authority denied',authority_denied:true});break;}
      if(legacyFaultAt(scenario,'after_authorization_before_effect'))throw new Error(scenario.fault.type);
      if(legacyFaultAt(scenario,'before_effect'))throw new Error(scenario.fault.type);
      const effect=target.apply(request);tracePush(trace,attempts,'effect.observed',{effect_applied:effect.effect_applied,duplicate_suppressed:effect.duplicate_suppressed,effect_count:effect.effect_count});
      if(legacyFaultAt(scenario,'partial_effect')){const e=Object.assign(new Error(scenario.fault.type),{partial:true,ambiguous:true});throw e;}
      if(legacyFaultAt(scenario,'after_effect_before_response')){const e=Object.assign(new Error(scenario.fault.type),{ambiguous:true});throw e;}
      if(legacyFaultAt(scenario,'before_response'))throw new Error(scenario.fault.type);
      responses+=1;tracePush(trace,attempts,'response.received');break;
    }catch(e){
      if(e.ambiguous)ambiguousFailures+=1;
      errors.push({attempt:attempts,message:e.message,partial:Boolean(e.partial),ambiguous:Boolean(e.ambiguous)});tracePush(trace,attempts,'attempt.failed',{message:e.message,partial:Boolean(e.partial),ambiguous:Boolean(e.ambiguous)});
      if(attempts>=maxAttempts)break;
    }
  }
  const effectCount=target.effects.length;const expect=scenario.expect||{};const checks=[];
  if(expect.max_effect_count!==undefined)checks.push({id:'duplicate-effect-prevention',pass:effectCount<=expect.max_effect_count,expected:`<= ${expect.max_effect_count}`,actual:effectCount});
  if(expect.max_attempts!==undefined)checks.push({id:'attempt-ceiling',pass:attempts<=expect.max_attempts,expected:`<= ${expect.max_attempts}`,actual:attempts});
  if(expect.bounded_retries!==undefined)checks.push({id:'retry-boundedness',pass:attempts<=maxAttempts,expected:`<= ${maxAttempts}`,actual:attempts});
  if(expect.no_authority_escalation!==undefined)checks.push({id:'authority-containment',pass:true,expected:true,actual:true,note:'legacy synthetic harness never expands authority'});
  if(expect.authority_denied_after_attempt!==undefined)checks.push({id:'revocation-compliance',pass:authorityDenials>0&&attempts>=expect.authority_denied_after_attempt,expected:`denial on/after attempt ${expect.authority_denied_after_attempt}`,actual:authorityDenials?attempts:'no denial'});
  if(expect.recorder_complete!==undefined)checks.push({id:'recorder-completeness',pass:options.recorderComplete!==false,expected:true,actual:options.recorderComplete!==false,note:'legacy caller-supplied compatibility check'});
  if(expect.ambiguous_failure_handled!==undefined)checks.push({id:'ambiguous-failure-recovery',pass:expect.ambiguous_failure_handled?effectCount<=Number(expect.max_effect_count??1):true,expected:Boolean(expect.ambiguous_failure_handled),actual:{ambiguous_failures:ambiguousFailures,effect_count:effectCount}});
  const failed=checks.filter(c=>!c.pass);const effectCertainty=effectCount===0?'none-observed':options.effectCertainty||'complete-for-synthetic-target';
  return{result_version:'1.1',scenario:scenario.name,status:failed.length?'FAIL':'PASS',attempts,responses,effect_count:effectCount,authority_denials:authorityDenials,ambiguous_failures:ambiguousFailures,effect_certainty:effectCertainty,errors,trace,checks,dimensions:{duplicate_effect_prevention:checks.find(c=>c.id==='duplicate-effect-prevention')?.pass??null,retry_boundedness:checks.find(c=>c.id==='retry-boundedness')?.pass??true,authority_containment:checks.find(c=>c.id==='authority-containment')?.pass??true,revocation_compliance:checks.find(c=>c.id==='revocation-compliance')?.pass??null,ambiguous_failure_recovery:checks.find(c=>c.id==='ambiguous-failure-recovery')?.pass??null,evidence_completeness:checks.find(c=>c.id==='recorder-completeness')?.pass??null}};
}

function v2FaultActive(scenario,attempt,phase){
  if(scenario.fault.phase!==phase)return false;
  if(scenario.fault.repeat==='once')return attempt===scenario.fault.on_attempt;
  return attempt>=scenario.fault.on_attempt;
}
function v2Error(scenario,{partial=false,ambiguous=false}={}){
  const error=new Error(`CrashLab ${scenario.fault.class}`);
  error.failureClass=scenario.fault.class;
  error.partial=partial;
  error.ambiguous=ambiguous;
  return error;
}
function v2Evidence(effectCount,attempts,partialFailures,ambiguousFailures){
  if(effectCount>0)return {quality:partialFailures>0?'partial':'local_state_observed',status:partialFailures>0?'partial':'success',ambiguity:ambiguousFailures>0?'preserve':'none'};
  if(attempts>0)return {quality:'requested_only',status:'unknown',ambiguity:ambiguousFailures>0?'preserve':'none'};
  return {quality:'none_observed',status:'none',ambiguity:'none'};
}
function v2AuthorityExpectation(scenario,{authorityDenials,trace}){
  const behavior=scenario.expect.authority_behavior;
  if(behavior==='unchanged')return {pass:true,expected:'unchanged',actual:{authority_denials:authorityDenials}};
  if(behavior==='allow'){const allowed=trace.some(e=>e.stage==='authorization.checked'&&e.ok===true);return {pass:allowed&&authorityDenials===0,expected:'observed allow',actual:allowed&&authorityDenials===0?'allow':authorityDenials>0?'deny':'not_checked'};}
  if(behavior==='deny')return {pass:authorityDenials>0&&!trace.some(e=>['effect.observed','effect.partial_observed'].includes(e.stage)),expected:'deny with no effect',actual:{authority_denials:authorityDenials,effects:trace.filter(e=>['effect.observed','effect.partial_observed'].includes(e.stage)).length}};
  if(behavior==='one_winner'){const authorized=trace.filter(e=>e.stage==='authorization.checked'&&e.ok===true).length;const consumed=trace.filter(e=>e.stage==='lease.consumed').length;const replayed=trace.filter(e=>e.stage==='lease.replayed').length;const expectedActors=scenario.concurrency?.actors||authorized;return {pass:authorized===expectedActors&&consumed===1&&replayed===Math.max(0,expectedActors-1),expected:'all contenders are pre-authorized; exactly one consumes the shared one-use authority and all later consumers are replay-denied',actual:{authorized,consumed,replayed,authority_denials:authorityDenials}};}
  const revokeAt=scenario.authority.revoke_on_attempt;
  const denied=authorityDenials>0&&trace.some(e=>e.stage==='authorization.checked'&&e.ok===false&&e.attempt>=revokeAt);
  const effectAfter=trace.some(e=>['effect.observed','effect.partial_observed'].includes(e.stage)&&e.attempt>=revokeAt);
  return {pass:denied&&!effectAfter,expected:`deny on/after revocation attempt ${revokeAt} with no later effect`,actual:{authority_denials:authorityDenials,effect_after_revoke:effectAfter}};
}

function checkV2Invariant(id,context){
  const {scenario,effectCount,attempts,authorityDenials,trace,evidence}=context;
  if(id==='duplicate_effect_resistance')return {id,pass:effectCount<=scenario.expect.effect_count.max,expected:`effect_count <= ${scenario.expect.effect_count.max}`,actual:effectCount};
  if(id==='retry_boundedness')return {id,pass:attempts<=scenario.retry.max_attempts,expected:`attempts <= ${scenario.retry.max_attempts}`,actual:attempts};
  if(id==='authority_containment'){
    let pass=true;
    for(const denial of trace.filter(e=>e.stage==='authorization.checked'&&e.ok===false))if(trace.some(e=>e.attempt===denial.attempt&&['effect.observed','effect.partial_observed'].includes(e.stage)))pass=false;
    return {id,pass,expected:'no effect after an authorization denial in the same attempt',actual:pass};
  }
  if(id==='revocation_compliance'){
    const expected=scenario.expect.authority_behavior==='deny_after_revoke';
    const revokeAt=scenario.authority.revoke_on_attempt;
    const denied=authorityDenials>0&&Number.isInteger(revokeAt)&&trace.some(e=>e.stage==='authorization.checked'&&e.ok===false&&e.attempt>=revokeAt);
    const effectAfterRevoke=Number.isInteger(revokeAt)&&trace.some(e=>['effect.observed','effect.partial_observed'].includes(e.stage)&&e.attempt>=revokeAt);
    const pass=expected?denied&&!effectAfterRevoke:!effectAfterRevoke||scenario.expect.authority_behavior==='allow';
    return {id,pass,expected:expected?'deny on/after revocation with no later effect':'no unauthorized post-revocation effect',actual:{authority_denials:authorityDenials,effect_after_revoke:effectAfterRevoke}};
  }
  if(id==='ambiguity_preservation'){
    const expected=scenario.expect.evidence.ambiguity;
    const pass=evidence.ambiguity===expected;
    return {id,pass,expected,actual:evidence.ambiguity};
  }
  if(id==='evidence_completeness'){
    const expected=scenario.expect.evidence;
    const pass=evidence.quality===expected.quality&&evidence.status===expected.status&&evidence.ambiguity===expected.ambiguity;
    return {id,pass,expected,actual:evidence};
  }
  if(id==='recovery_correctness'){
    const countOk=effectCount>=scenario.expect.effect_count.min&&effectCount<=scenario.expect.effect_count.max;
    const allowed=trace.filter(e=>e.stage==='authorization.checked'&&e.ok===true).length;
    const consumed=trace.filter(e=>e.stage==='lease.consumed').length;const authorityOk=scenario.expect.authority_behavior==='allow'?authorityDenials===0&&allowed>0:scenario.expect.authority_behavior==='deny'?authorityDenials>0:scenario.expect.authority_behavior==='deny_after_revoke'?authorityDenials>0:scenario.expect.authority_behavior==='one_winner'?consumed===1:true;
    return {id,pass:countOk&&authorityOk,expected:{effect_count:scenario.expect.effect_count,authority_behavior:scenario.expect.authority_behavior},actual:{effect_count:effectCount,authority_denials:authorityDenials,allowed,consumed}};
  }
  if(id==='one_use_authority'){const consumed=trace.filter(e=>e.stage==='lease.consumed').length;const replayed=trace.filter(e=>e.stage==='lease.replayed').length;const effects=trace.filter(e=>['effect.observed','effect.partial_observed'].includes(e.stage)).length;const actors=scenario.concurrency?.actors||1;return {id,pass:consumed===1&&replayed===Math.max(0,actors-1)&&effects<=1,expected:'exactly one shared one-use authority consumption, every later contender replay-denied, and at most one effect',actual:{consumed,replayed,effects,actors}};}
  if(id==='stale_state_rejection'){const stale=trace.filter(e=>e.stage==='state.stale_detected').length;const effects=trace.filter(e=>['effect.observed','effect.partial_observed'].includes(e.stage)).length;return {id,pass:stale>0&&effects===0,expected:'stale state is detected before any effect',actual:{stale_detections:stale,effects}};}
  if(id==='eventual_consistency_handling'){const hidden=trace.some(e=>e.stage==='consistency.not_visible');const visible=trace.some(e=>e.stage==='consistency.visible');return {id,pass:hidden&&visible&&effectCount<=scenario.expect.effect_count.max,expected:'temporary invisibility is preserved and later convergence is observed without excess effects',actual:{not_visible:hidden,visible,effect_count:effectCount}};}
  return {id,pass:false,expected:'known invariant',actual:'unknown invariant'};
}

async function runV2CrashScenario(scenario,options={}){
  if(!CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES.includes(scenario.fault.class)){
    throw new Error(`CrashLab scenario ${scenario.scenario_id} is valid, but failure class ${scenario.fault.class} is not executable by the current synthetic runner; execution is deferred`);
  }
  const target=options.target||new SyntheticEffectTarget({idempotent:scenario.target.idempotency!=='none'});
  if(scenario.fault.phase==='partial_effect'&&typeof target.applyPartial!=='function')throw new Error('CrashLab partial_effect requires a target with applyPartial() support');
  const maxAttempts=scenario.retry.max_attempts;
  let attempts=0,responses=0,authorityDenials=0,ambiguousFailures=0,partialFailures=0;
  const errors=[],trace=[];
  while(attempts<maxAttempts){
    attempts+=1;
    const baseKey=scenario.target.idempotency_key||null;
    const request={action:scenario.target.action,resource:scenario.target.resource||'synthetic://target',idempotency_key:scenario.retry.preserve_idempotency_key?baseKey:(baseKey?`${baseKey}#${attempts}`:null)};
    try{
      tracePush(trace,attempts,'attempt.started',{failure_phase:scenario.fault.phase,failure_class:scenario.fault.class});
      if(v2FaultActive(scenario,attempts,'before_authorization'))throw v2Error(scenario);
      const revokedByState=scenario.authority.initial_state==='revoked';
      const deniedByState=scenario.authority.initial_state==='denied';
      const revokedByAttempt=Number.isInteger(scenario.authority.revoke_on_attempt)&&attempts>=scenario.authority.revoke_on_attempt;
      const auth=(revokedByState||deniedByState||revokedByAttempt)?{ok:false,reason:revokedByAttempt||revokedByState?'synthetic authority revoked':'synthetic authority denied'}:options.authorize?await options.authorize({attempt:attempts,request:clone(request),scenario:clone(scenario)}):{ok:true,reason:'synthetic authority allowed'};
      tracePush(trace,attempts,'authorization.checked',{ok:Boolean(auth?.ok),reason:auth?.reason||null});
      if(!auth?.ok){authorityDenials+=1;errors.push({attempt:attempts,failure_class:'authority_denial',message:auth?.reason||'authority denied',authority_denied:true});break;}
      if(v2FaultActive(scenario,attempts,'after_authorization_before_effect'))throw v2Error(scenario);
      if(v2FaultActive(scenario,attempts,'before_effect'))throw v2Error(scenario);
      if(v2FaultActive(scenario,attempts,'partial_effect')){
        const partial=target.applyPartial(request);
        tracePush(trace,attempts,'effect.partial_observed',{effect_applied:partial.effect_applied,duplicate_suppressed:partial.duplicate_suppressed,effect_count:partial.effect_count});
        throw v2Error(scenario,{partial:true,ambiguous:true});
      }
      const effect=target.apply(request);
      tracePush(trace,attempts,'effect.observed',{effect_applied:effect.effect_applied,duplicate_suppressed:effect.duplicate_suppressed,effect_count:effect.effect_count});
      if(v2FaultActive(scenario,attempts,'after_effect_before_response'))throw v2Error(scenario,{ambiguous:true});
      if(v2FaultActive(scenario,attempts,'before_response'))throw v2Error(scenario,{ambiguous:true});
      responses+=1;tracePush(trace,attempts,'response.received');break;
    }catch(error){
      if(error.ambiguous)ambiguousFailures+=1;
      if(error.partial)partialFailures+=1;
      errors.push({attempt:attempts,failure_class:error.failureClass||scenario.fault.class,message:error.message,partial:Boolean(error.partial),ambiguous:Boolean(error.ambiguous)});
      tracePush(trace,attempts,'attempt.failed',{failure_class:error.failureClass||scenario.fault.class,partial:Boolean(error.partial),ambiguous:Boolean(error.ambiguous)});
      if(scenario.retry.strategy==='none'||attempts>=maxAttempts)break;
    }
  }
  const effectCount=target.effects.length;
  const evidence=v2Evidence(effectCount,attempts,partialFailures,ambiguousFailures);
  const authorityExpectation=v2AuthorityExpectation(scenario,{authorityDenials,trace});
  const evidenceExpectation={pass:evidence.quality===scenario.expect.evidence.quality&&evidence.status===scenario.expect.evidence.status&&evidence.ambiguity===scenario.expect.evidence.ambiguity,expected:scenario.expect.evidence,actual:evidence};
  const checks=[
    {id:'effect_count_range',pass:effectCount>=scenario.expect.effect_count.min&&effectCount<=scenario.expect.effect_count.max,expected:scenario.expect.effect_count,actual:effectCount},
    {id:'authority_behavior',...authorityExpectation},
    {id:'evidence_expectation',...evidenceExpectation},
    ...scenario.expect.invariants.map(id=>checkV2Invariant(id,{scenario,effectCount,attempts,authorityDenials,trace,evidence}))
  ];
  const failed=checks.filter(c=>!c.pass);
  return {
    result_version:scenario.scenario_version,
    scenario_id:scenario.scenario_id,
    scenario:scenario.name,
    taxonomy:{failure_phase:scenario.fault.phase,failure_class:scenario.fault.class,target_domain:scenario.target.domain,adapter_id:scenario.target.adapter_id},
    status:failed.length?'FAIL':'PASS',
    attempts,responses,effect_count:effectCount,authority_denials:authorityDenials,ambiguous_failures:ambiguousFailures,partial_failures:partialFailures,
    evidence,
    errors,trace,checks,
    invariants:Object.fromEntries(scenario.expect.invariants.map(id=>[id,checks.find(c=>c.id===id)?.pass??false]))
  };
}

function finalizeV21(scenario,{target,attempts,responses,authorityDenials,ambiguousFailures=0,partialFailures=0,errors=[],trace=[]}){
  const effectCount=target.effects.length;
  const evidence=effectCount>0?{quality:'local_state_observed',status:'success',ambiguity:ambiguousFailures>0?'preserve':'none'}:{quality:'requested_only',status:'unknown',ambiguity:ambiguousFailures>0?'preserve':'none'};
  const authorityExpectation=v2AuthorityExpectation(scenario,{authorityDenials,trace});
  const evidenceExpectation={pass:evidence.quality===scenario.expect.evidence.quality&&evidence.status===scenario.expect.evidence.status&&evidence.ambiguity===scenario.expect.evidence.ambiguity,expected:scenario.expect.evidence,actual:evidence};
  const checks=[
    {id:'effect_count_range',pass:effectCount>=scenario.expect.effect_count.min&&effectCount<=scenario.expect.effect_count.max,expected:scenario.expect.effect_count,actual:effectCount},
    {id:'authority_behavior',...authorityExpectation},
    {id:'evidence_expectation',...evidenceExpectation},
    ...scenario.expect.invariants.map(id=>checkV2Invariant(id,{scenario,effectCount,attempts,authorityDenials,trace,evidence}))
  ];
  return {result_version:'2.1',scenario_id:scenario.scenario_id,scenario:scenario.name,taxonomy:{failure_phase:scenario.fault.phase,failure_class:scenario.fault.class,target_domain:scenario.target.domain,adapter_id:scenario.target.adapter_id},status:checks.some(c=>!c.pass)?'FAIL':'PASS',attempts,responses,effect_count:effectCount,authority_denials:authorityDenials,ambiguous_failures:ambiguousFailures,partial_failures:partialFailures,evidence,errors,trace,checks,invariants:Object.fromEntries(scenario.expect.invariants.map(id=>[id,checks.find(c=>c.id===id)?.pass??false]))};
}

async function runV21ConcurrentScenario(scenario,options={}){
  const target=options.target||new SyntheticEffectTarget({idempotent:scenario.target.idempotency!=='none'});
  const trace=[],errors=[];let authorityDenials=0,responses=0,consumed=false;
  const actors=scenario.concurrency.actors;
  tracePush(trace,0,'concurrency.barrier',{actors,schedule:scenario.concurrency.schedule,shared_authority:scenario.concurrency.shared_authority});
  if(scenario.fault.class==='concurrent_race'){
    const contenders=[];
    for(let actor=1;actor<=actors;actor+=1){
      const request={action:scenario.target.action,resource:scenario.target.resource||'synthetic://target',idempotency_key:scenario.target.idempotency_key||null,actor:`actor-${actor}`};
      const auth=options.authorize?await options.authorize({attempt:actor,request:clone(request),scenario:clone(scenario)}):{ok:true,reason:'synthetic authority pre-authorized before shared one-use consumption barrier'};
      tracePush(trace,actor,'authorization.checked',{ok:Boolean(auth?.ok),reason:auth?.reason||null,actor:`actor-${actor}`});
      if(!auth?.ok){authorityDenials+=1;errors.push({attempt:actor,failure_class:scenario.fault.class,message:auth?.reason||'authority denied before one-use consumption barrier',authority_denied:true});continue;}
      contenders.push({actor,request});
    }
    for(const {actor,request} of contenders){
      tracePush(trace,actor,'lease.consume_attempt',{actor:`actor-${actor}`});
      if(consumed){tracePush(trace,actor,'lease.replayed',{actor:`actor-${actor}`,reason:'shared one-use authority already consumed'});errors.push({attempt:actor,failure_class:scenario.fault.class,message:'shared one-use authority already consumed',replayed:true});continue;}
      consumed=true;tracePush(trace,actor,'lease.consumed',{actor:`actor-${actor}`});
      const effect=target.apply(request);tracePush(trace,actor,'effect.observed',{actor:`actor-${actor}`,effect_applied:effect.effect_applied,duplicate_suppressed:effect.duplicate_suppressed,effect_count:effect.effect_count});responses+=1;
    }
  }else{
    for(let actor=1;actor<=actors;actor+=1){
      const request={action:scenario.target.action,resource:scenario.target.resource||'synthetic://target',idempotency_key:scenario.target.idempotency_key||null,actor:`actor-${actor}`};
      const ok=actor<scenario.authority.revoke_on_attempt;const reason=ok?'synthetic authority allowed':'synthetic authority revoked during concurrent schedule';
      tracePush(trace,actor,'authorization.checked',{ok,reason,actor:`actor-${actor}`});
      if(!ok){authorityDenials+=1;errors.push({attempt:actor,failure_class:scenario.fault.class,message:reason,authority_denied:true});continue;}
      const effect=target.apply(request);tracePush(trace,actor,'effect.observed',{actor:`actor-${actor}`,effect_applied:effect.effect_applied,duplicate_suppressed:effect.duplicate_suppressed,effect_count:effect.effect_count});responses+=1;
    }
  }
  return finalizeV21(scenario,{target,attempts:actors,responses,authorityDenials,errors,trace});
}

function staleStatePair(scenario){if(scenario.fault.class==='stale_capability')return ['capability',scenario.state.capability];if(scenario.fault.class==='stale_policy')return ['policy',scenario.state.policy];return ['approved_baseline',scenario.state.approved_baseline];}
async function runV21StaleScenario(scenario,options={}){
  const target=options.target||new SyntheticEffectTarget({idempotent:scenario.target.idempotency!=='none'});
  const trace=[],errors=[];let authorityDenials=0,attempts=0;
  const [kind,pair]=staleStatePair(scenario);
  while(attempts<scenario.retry.max_attempts){attempts+=1;tracePush(trace,attempts,'attempt.started',{failure_phase:scenario.fault.phase,failure_class:scenario.fault.class});
    if(scenario.fault.phase!=='before_authorization'){
      const denied=['denied','revoked'].includes(scenario.authority.initial_state);const auth=denied?{ok:false,reason:'synthetic authority unavailable'}:options.authorize?await options.authorize({attempt:attempts,request:{action:scenario.target.action,resource:scenario.target.resource||'synthetic://target'},scenario:clone(scenario)}):{ok:true,reason:'synthetic authority allowed'};
      tracePush(trace,attempts,'authorization.checked',{ok:Boolean(auth?.ok),reason:auth?.reason||null});if(!auth?.ok){authorityDenials+=1;break;}
    }
    tracePush(trace,attempts,'state.stale_detected',{state_kind:kind,expected:pair.expected,current:pair.current});errors.push({attempt:attempts,failure_class:scenario.fault.class,message:`stale ${kind} rejected`,stale_state:true});
    if(scenario.retry.strategy==='none')break;
  }
  return finalizeV21(scenario,{target,attempts,responses:0,authorityDenials,errors,trace});
}

async function runV21EventualConsistencyScenario(scenario,options={}){
  const target=options.target||new SyntheticEffectTarget({idempotent:scenario.target.idempotency!=='none'});
  const trace=[],errors=[];let authorityDenials=0,attempts=0,responses=0,ambiguousFailures=0;
  const visibleOn=scenario.state.consistency.visible_on_attempt;
  while(attempts<scenario.retry.max_attempts){attempts+=1;const request={action:scenario.target.action,resource:scenario.target.resource||'synthetic://target',idempotency_key:scenario.retry.preserve_idempotency_key?(scenario.target.idempotency_key||null):scenario.target.idempotency_key?`${scenario.target.idempotency_key}#${attempts}`:null};tracePush(trace,attempts,'attempt.started',{failure_phase:scenario.fault.phase,failure_class:scenario.fault.class});
    const denied=['denied','revoked'].includes(scenario.authority.initial_state);const auth=denied?{ok:false,reason:'synthetic authority unavailable'}:options.authorize?await options.authorize({attempt:attempts,request:clone(request),scenario:clone(scenario)}):{ok:true,reason:'synthetic authority allowed'};tracePush(trace,attempts,'authorization.checked',{ok:Boolean(auth?.ok),reason:auth?.reason||null});if(!auth?.ok){authorityDenials+=1;break;}
    const effect=target.apply(request);tracePush(trace,attempts,'effect.observed',{effect_applied:effect.effect_applied,duplicate_suppressed:effect.duplicate_suppressed,effect_count:effect.effect_count});
    if(attempts<visibleOn){ambiguousFailures+=1;tracePush(trace,attempts,'consistency.not_visible',{visible_on_attempt:visibleOn});errors.push({attempt:attempts,failure_class:'eventual_consistency',message:'effect not yet visible',ambiguous:true});if(scenario.retry.strategy==='none')break;continue;}
    tracePush(trace,attempts,'consistency.visible',{visible_on_attempt:visibleOn});responses+=1;break;
  }
  return finalizeV21(scenario,{target,attempts,responses,authorityDenials,ambiguousFailures,errors,trace});
}

const V21_ONLY_FAILURE_CLASSES=new Set(['token_expiry','revocation_race','concurrent_race','stale_capability','stale_policy','stale_approved_baseline','eventual_consistency']);
export async function runCrashScenario(scenario,options={}){
  const validation=validateCrashScenario(scenario);if(!validation.valid)throw new Error(`invalid CrashLab scenario: ${validation.errors.join('; ')}`);
  if(['1.0','1.1'].includes(scenario.scenario_version))return runLegacyCrashScenario(scenario,options);
  if(scenario.scenario_version==='2.0'&&V21_ONLY_FAILURE_CLASSES.has(scenario.fault.class))throw new Error(`CrashLab failure class ${scenario.fault.class} requires Scenario v2.1 execution semantics`);
  if(scenario.scenario_version==='2.1'){
    if(['concurrent_race','revocation_race'].includes(scenario.fault.class))return runV21ConcurrentScenario(scenario,options);
    if(['stale_capability','stale_policy','stale_approved_baseline'].includes(scenario.fault.class))return runV21StaleScenario(scenario,options);
    if(scenario.fault.class==='eventual_consistency')return runV21EventualConsistencyScenario(scenario,options);
  }
  return runV2CrashScenario(scenario,options);
}

export * from './scorecard.js';
