/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {
  ADAPTER_CONTRACT_VERSION,
  adapterDescriptor,
  adaptFilesystemAction,
  runAdapterConformance,
  validateAdapterDescriptor,
  validateEffectReceiptAgainstAdapter
} from '../src/index.js';

const descriptor=adapterDescriptor('filesystem-action');
assert.equal(ADAPTER_CONTRACT_VERSION,'1.1');
assert.equal(validateAdapterDescriptor(descriptor).valid,true);
assert.equal(validateAdapterDescriptor({...descriptor,mode:'magic'}).valid,false);
assert.equal(validateAdapterDescriptor({...descriptor,observation_capabilities:[{quality:'omniscient',boundary:'x',statuses:['unknown']}]}).valid,false);

const normalized=adaptFilesystemAction('delete','./build/cache',{}, {timestamp:'2026-08-26T12:00:00.000Z'});
assert.equal(normalized.context.adapter_contract.adapter_id,'filesystem-action');
assert.equal(normalized.context.adapter_contract.mode,'normalize');
assert.deepEqual(normalized.context.adapter_contract.observation_qualities,['requested_only']);
assert.equal(normalized.context.adapter_contract.observation_capabilities[0].boundary,'filesystem-action-request');

const conformance=await runAdapterConformance({
  descriptor,
  normalize:(input,options)=>adaptFilesystemAction(input.operation,input.path,input.arguments,options)
},[{input:{operation:'read',path:'./public/a.txt'},options:{timestamp:'2026-08-26T12:00:00.000Z'}},{input:{operation:'delete',path:'./build/cache'},options:{timestamp:'2026-08-26T12:00:01.000Z'}}]);
assert.equal(conformance.ok,true,conformance.errors.join('; '));
assert.equal(conformance.results.length,2);

const receipt={effect_version:'1.1',effect_id:'effect-1',lease_id:'lease-1',decision_id:'decision-1',adapter:'filesystem-action',adapter_contract_version:'1.1',started_at:'2026-08-26T12:00:00.000Z',completed_at:'2026-08-26T12:00:01.000Z',status:'unknown',observation_quality:'requested_only',observation_boundary:'filesystem-action-request',observed:{}};
assert.equal(validateEffectReceiptAgainstAdapter(receipt,descriptor).ok,true);
assert.equal(validateEffectReceiptAgainstAdapter({...receipt,adapter:'http-action'},descriptor).ok,false);
assert.equal(validateEffectReceiptAgainstAdapter({...receipt,observation_quality:'partial',observation_boundary:'partial-observation'},descriptor).ok,false);

console.log('adapter conformance contract tests passed');
