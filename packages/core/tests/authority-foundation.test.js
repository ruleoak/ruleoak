/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import {
  buildAuthorityGrant, buildAuthorityEnvelope, previewAuthorityEnvelope, verifyAuthorityEnvelope, authorizeWithAuthorityEnvelope, RevocationRegistry,
  evaluatePermissionRequest, buildExecutionLease, verifyExecutionLease, consumeExecutionLease, buildEffectReceipt, verifyEffectReceipt,
  RuleOakAuthorityLedger, verifyEvidence, budgetIsWithin, evaluateAuthorityBudget, evaluateObligations
} from '../src/index.js';
const now='2026-08-26T12:00:00.000Z', secret='authority-foundation-secret';
const grant=buildAuthorityGrant({issuer:'user:owner',subject:{type:'agent',id:'agent-a'},principal_chain:[{type:'user',id:'user:owner'},{type:'agent',id:'agent-a'}],capabilities:[{actions:['resource.read','resource.delete'],resources:['ruleoak://file/project/**']}],not_before:now,expires_at:'2026-08-26T13:00:00.000Z',session_id:'s1'},{secret,issuedAt:now});
const envelope=buildAuthorityEnvelope(grant,{capabilities:[{actions:['resource.delete'],resources:['ruleoak://file/project/build/**']}],constraints:{max_executions:1,max_objects:2500,network:'deny',delegation_allowed:false},obligations:[{type:'require_effect_receipt'}]},{authoritySecret:secret,envelopeSecret:secret,now});
assert.equal(verifyAuthorityEnvelope(envelope,{grant,secret,now}).ok,true);
const preview=previewAuthorityEnvelope(grant,{capabilities:[{actions:['resource.delete'],resources:['ruleoak://file/project/build/**']}],constraints:{max_executions:1},expires_at:'2026-08-26T12:30:00.000Z'},{authoritySecret:secret,now});assert.equal(preview.ok,true);assert.equal(preview.attenuation.temporal.narrows_expiry,true);assert.equal(previewAuthorityEnvelope(grant,{capabilities:[{actions:['resource.write'],resources:['ruleoak://file/project/**']}]},{authoritySecret:secret,now}).ok,false);
const call={call_id:'c1',timestamp:now,actor:{type:'agent',id:'agent-a',name:'agent-a',session_id:'s1'},tool:{name:'filesystem.delete',category:'file',operation:'delete'},target:{resource:'project/build/cache',scope:'local',sensitivity:'internal'},arguments:{},context:{}};
assert.equal(authorizeWithAuthorityEnvelope(envelope,call,{grant,authoritySecret:secret,envelopeSecret:secret,now}).ok,true);
const outside={...call,target:{...call.target,resource:'project/src/index.js'}};
assert.equal(authorizeWithAuthorityEnvelope(envelope,outside,{grant,authoritySecret:secret,envelopeSecret:secret,now}).ok,false);
const registry=new RevocationRegistry();
registry.revoke('authority_envelope',envelope.envelope_id,{now,reason:'owner stop'});
assert.equal(verifyAuthorityEnvelope(envelope,{grant,secret,now,revocationRegistry:registry}).ok,false);
const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'delete-build',effect:'allow',actions:['filesystem.delete'],resources:['project/build/**'],allowCritical:true}]};
const result=evaluatePermissionRequest(call,policy,{authorityGrant:grant,authorityEnvelope:envelope,authoritySecret:secret,envelopeSecret:secret,evaluatedAt:now});
assert.equal(result.decision.action,'allow');
const lease=buildExecutionLease(result,policy,{secret,issuedAt:now,ttlMs:60000});
assert.equal(verifyExecutionLease(lease,call,policy,{secret,now,usage:{objects:2417},obligationContext:{}}).ok,true);
assert.equal(verifyExecutionLease(lease,call,policy,{secret,now,usage:{objects:2501},obligationContext:{}}).ok,false);
const dir=mkdtempSync(join(tmpdir(),'ruleoak-lease-'));
const consumed=consumeExecutionLease(lease,call,policy,{secret,now,storeDir:dir,usage:{objects:2417},obligationContext:{}}); assert.equal(consumed.ok,true);
assert.equal(consumeExecutionLease(lease,call,policy,{secret,now,storeDir:dir,usage:{objects:2417},obligationContext:{}}).replayed,true);
const effect=buildEffectReceipt(lease,{status:'success',observation_quality:'complete_for_adapter',requested:{objects:2417},observed:{attempted:2417,succeeded:2417,failed:0,outside_scope_observed:0}},{adapter:'filesystem',startedAt:now,completedAt:'2026-08-26T12:00:01.000Z',secret,observationBoundary:'filesystem-test-boundary'});
assert.equal(verifyEffectReceipt(effect,{lease,secret,obligationContext:{}}).ok,true);
assert.equal(budgetIsWithin({max_objects:10},{max_objects:5}).ok,false);
assert.equal(evaluateAuthorityBudget({max_amount:5},{amount:5.01}).ok,false);
assert.equal(evaluateObligations([{type:'execution_before',deadline:'2026-08-26T12:10:00.000Z'}],{now},'pre').ok,true);
const evidence=join(dir,'evidence.jsonl');const ledger=new RuleOakAuthorityLedger(evidence);ledger.grantCreated(grant);ledger.leaseIssued(lease);ledger.leaseConsumed(lease,consumed.marker);ledger.effectRecorded(effect);assert.equal(verifyEvidence(ledger.recorder.readEvents()).ok,true);
console.log('authority foundation tests passed');
