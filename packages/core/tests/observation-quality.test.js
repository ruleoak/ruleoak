/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {
  ADAPTER_CONTRACT_VERSION, adapterDescriptor, buildEffectReceipt, validateAdapterDescriptor,
  validateEffectReceiptAgainstAdapter
} from '../src/index.js';
import { validateEffectReceipt } from '@ruleoak/protocol';

const lease={lease_id:'lease_obs',decision_id:'decision_obs'};
assert.equal(ADAPTER_CONTRACT_VERSION,'1.1');

const legacy={effect_version:'1.0',effect_id:'legacy',lease_id:'l',decision_id:'d',adapter:'legacy',started_at:'2026-08-27T00:00:00.000Z',completed_at:'2026-08-27T00:00:01.000Z',status:'success',observation_quality:'complete-for-adapter',observed:{}};
assert.equal(validateEffectReceipt(legacy).valid,true);
assert.throws(()=>buildEffectReceipt(lease,{status:'success',observation_quality:'complete-for-adapter',observed:{}},{effectId:'legacy-label-new-receipt',adapter:'custom',observationBoundary:'custom-boundary',startedAt:'2026-08-27T00:00:00.000Z',completedAt:'2026-08-27T00:00:01.000Z'}),/legacy observation quality/);

const requested=buildEffectReceipt(lease,{status:'unknown',observation_quality:'requested_only',observed:{}},{effectId:'requested',adapter:'test',startedAt:'2026-08-27T00:00:00.000Z',completedAt:'2026-08-27T00:00:01.000Z'});
assert.equal(requested.effect_version,'1.1');
assert.equal(requested.adapter_contract_version,'1.1');
assert.equal(requested.observation_boundary,'requested-action-only');
assert.equal(validateEffectReceipt(requested).valid,true);
assert.equal(validateEffectReceipt({...requested,status:'success'}).valid,false);
assert.equal(validateEffectReceipt({...requested,observation_quality:'ambiguous',status:'success',observation_boundary:'ambiguous-effect'}).valid,false);
assert.equal(validateEffectReceipt({...requested,private_context:'forbidden'}).valid,false);

const mcp=adapterDescriptor('mcp-http-gateway');
assert.equal(validateAdapterDescriptor(mcp).valid,true);
const remote=buildEffectReceipt(lease,{status:'unknown',observation_quality:'remote_response_observed',observed:{upstream_http_status:200}},{effectId:'remote',adapter:'mcp-http-gateway',startedAt:'2026-08-27T00:00:00.000Z',completedAt:'2026-08-27T00:00:01.000Z',descriptor:mcp});
assert.equal(remote.observation_boundary,'mcp-upstream-http-response');
assert.equal(validateEffectReceiptAgainstAdapter(remote,mcp).ok,true);
assert.equal(validateEffectReceiptAgainstAdapter({...remote,status:'success'},mcp).ok,false);
assert.equal(validateEffectReceiptAgainstAdapter({...remote,observation_boundary:'other-boundary'},mcp).ok,false);
assert.equal(validateAdapterDescriptor({...mcp,observation_capabilities:[...mcp.observation_capabilities,{...mcp.observation_capabilities[0],boundary:'duplicate-boundary'}]}).valid,false);

const fs=adapterDescriptor('filesystem-action');
assert.deepEqual(fs.observation_capabilities.map(x=>x.quality),['requested_only']);
assert.equal(validateAdapterDescriptor({...fs,observation_capabilities:[{quality:'complete_for_adapter',boundary:'fake',statuses:['success']}]}).valid,false);
assert.throws(()=>buildEffectReceipt(lease,{status:'success',observation_quality:'complete_for_adapter',observed:{}},{effectId:'strong-no-boundary',adapter:'custom',startedAt:'2026-08-27T00:00:00.000Z',completedAt:'2026-08-27T00:00:01.000Z'}),/requires an adapter descriptor or explicit observationBoundary/);
const explicit=buildEffectReceipt(lease,{status:'success',observation_quality:'complete_for_adapter',observed:{}},{effectId:'strong-explicit',adapter:'custom',observationBoundary:'custom-verified-boundary',startedAt:'2026-08-27T00:00:00.000Z',completedAt:'2026-08-27T00:00:01.000Z'});assert.equal(explicit.observation_boundary,'custom-verified-boundary');

console.log('Observation Quality tests passed');
