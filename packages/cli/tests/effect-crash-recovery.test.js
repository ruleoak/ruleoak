/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adaptFilesystemAction, buildExecutionLease, evaluatePermissionRequest, inferFilesystemEffectContract } from '@ruleoak/core';
import { listUnresolvedEffects, loadEffectState, persistInflightEffect, reconcilePendingEffects, recoverInflightEffects } from '../src/effect-state.js';

const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['*'],priority:100}]};
function leaseFor(path){const call=adaptFilesystemAction('write',path,{}, {actor:{type:'agent',name:'recovery-test',sessionId:'s'}});const result=evaluatePermissionRequest(call,policy,{evaluatedAt:new Date().toISOString()});return buildExecutionLease(result,policy,{ttlMs:60000});}

const root=mkdtempSync(join(tmpdir(),'ruleoak-inflight-recovery-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});
const target=join(root,'committed.txt'),lease=leaseFor(target),contract=inferFilesystemEffectContract({operation:'write_file',path:target,content:'committed'});
persistInflightEffect(root,{effect_id:'effect_crash_committed',adapter:'mcp-stdio-gateway',started_at:new Date().toISOString(),requested:{name:'write_file'},execution_lease:lease,effect_contract:contract,verifier_spec:contract.verifier_spec});
assert.equal(listUnresolvedEffects(root).length,1);assert.equal(listUnresolvedEffects(root)[0].inflight,true);
writeFileSync(target,'committed');
let recovered=recoverInflightEffects(root);assert.equal(recovered.recovered,1);assert.equal(recovered.results[0].state,'confirmed_success');assert.equal(recovered.results[0].disposition,'do_not_retry');
let loaded=loadEffectState(root,'effect_crash_committed');assert.equal(loaded.bucket,'resolved');assert.equal(loaded.state.recovered_from_inflight,true);assert.equal(listUnresolvedEffects(root).length,0);

// A crash before the idempotent write reaches the filesystem can be proven as
// no-effect, but the old lease remains consumed and retry requires fresh authority.
const untouched=join(root,'untouched.txt'),lease2=leaseFor(untouched),contract2=inferFilesystemEffectContract({operation:'write_file',path:untouched,content:'future',idempotent:true});
persistInflightEffect(root,{effect_id:'effect_crash_no_effect',adapter:'mcp-stdio-gateway',started_at:new Date().toISOString(),requested:{name:'write_file'},execution_lease:lease2,effect_contract:contract2,verifier_spec:contract2.verifier_spec});
const reconciled=reconcilePendingEffects(root,{limit:10});assert.equal(reconciled.recovered_inflight,1);loaded=loadEffectState(root,'effect_crash_no_effect');assert.equal(loaded.state.effect_verification.state,'confirmed_failure');assert.equal(loaded.state.retry_decision.disposition,'safe_to_retry_with_new_authority');assert.equal(loaded.state.retry_decision.requires_new_authority,true);assert.equal(reconciled.executes_retry,false);
console.log('Effect crash-recovery tests passed');
