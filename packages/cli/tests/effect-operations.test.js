/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adaptFilesystemAction, buildEffectReceipt, buildEffectVerificationRecord, buildExecutionLease, decideEffectRetry, evaluatePermissionRequest } from '@ruleoak/core';
import { listPendingEffects, loadEffectState, persistEffectState, reconcilePendingEffects, reverifyEffect, retryPlan } from '../src/effect-state.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-effects-'));
mkdirSync(join(root,'.ruleoak'),{recursive:true});
const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['*'],priority:100}]};

function pendingFilesystemEffect(path,expected,idempotent=false){
  const call=adaptFilesystemAction('write',path,{}, { actor:{type:'agent',name:'a',sessionId:`s-${Math.random()}`} });
  const result=evaluatePermissionRequest(call,policy,{evaluatedAt:new Date().toISOString()});
  const lease=buildExecutionLease(result,policy,{ttlMs:60000});
  const receipt=buildEffectReceipt(lease,{status:'unknown',observation_quality:'ambiguous',requested:{name:'filesystem.write'},observed:{response_received:false}},{adapter:'test',adapterContractVersion:'1.1',observationBoundary:'test-ambiguous'});
  const verification=buildEffectVerificationRecord(receipt,{state:'unknown',reason:'response lost',evidence:{effect_applied:null,retry_safe:false}},{lease});
  const retry=decideEffectRetry(receipt,verification,{lease});
  persistEffectState(root,{effect_receipt:receipt,effect_verification:verification,retry_decision:retry,execution_lease:lease,lease_binding:{lease_id:lease.lease_id,decision_id:lease.decision_id,action_digest:lease.action_digest},verifier_spec:{kind:'filesystem',operation:'write',path,expected:{sha256:expected},idempotent}});
  return {receipt,lease};
}

const path=join(root,'out.txt');
const expected=`sha256:${createHash('sha256').update('done').digest('hex')}`;
const first=pendingFilesystemEffect(path,expected);
assert.equal(listPendingEffects(root).length,1);
assert.equal(retryPlan(root,first.receipt.effect_id).executes_retry,false);
writeFileSync(path,'done');
const updated=reverifyEffect(root,first.receipt.effect_id);
assert.equal(updated.verification.state,'confirmed_success');
assert.equal(updated.retry.disposition,'do_not_retry');
assert.equal(listPendingEffects(root).length,0);
assert.equal(loadEffectState(root,first.receipt.effect_id).bucket,'resolved');

// Reconciliation is a bounded read-only operator loop: it can safely re-run
// serializable local postconditions for many pending effects but never retries them.
const secondPath=join(root,'second.txt');
const secondExpected=`sha256:${createHash('sha256').update('second').digest('hex')}`;
const second=pendingFilesystemEffect(secondPath,secondExpected);
writeFileSync(secondPath,'second');
const reconciled=reconcilePendingEffects(root,{limit:10});
assert.equal(reconciled.examined,1);
assert.equal(reconciled.resolved,1);
assert.equal(reconciled.still_pending,0);
assert.equal(reconciled.executes_retry,false);
assert.equal(loadEffectState(root,second.receipt.effect_id).bucket,'resolved');

// Unsupported verifier specifications remain pending and are surfaced for manual
// verification; reconciliation must not deserialize or execute arbitrary code.
const manualPath=join(root,'manual.txt');
const manualExpected=`sha256:${createHash('sha256').update('manual').digest('hex')}`;
const manual=pendingFilesystemEffect(manualPath,manualExpected);
const manualState=loadEffectState(root,manual.receipt.effect_id).state;
persistEffectState(root,{...manualState,verifier_spec:{kind:'http',url:'https://example.invalid'}});
const manualResult=reconcilePendingEffects(root,{limit:10});
assert.equal(manualResult.examined,1);
assert.equal(manualResult.resolved,0);
assert.equal(manualResult.manual_required,1);
assert.equal(manualResult.executes_retry,false);
assert.equal(loadEffectState(root,manual.receipt.effect_id).bucket,'pending');
console.log('Effect operations tests passed');
