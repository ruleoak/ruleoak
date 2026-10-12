/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAuthorityGrant } from '@ruleoak/core';
import { createFlightControlServer, normalizeBoundedEnvelopeRequest } from '../src/flight-control/server.js';
import { createWorkspaceAuthorityEnvelope, previewWorkspaceAuthorityEnvelope, readFlightState, writeAuthorityArtifact } from '../src/flight-control/store.js';

const dir = mkdtempSync(join(tmpdir(), 'ro-flight-'));
mkdirSync(join(dir, '.ruleoak'), { recursive: true });
writeFileSync(join(dir, '.ruleoak/policy.json'), JSON.stringify({ policyVersion: 2, defaultAction: 'deny' }));
const secret = 'flight-authority-secret';
const now = '2026-08-26T12:00:00.000Z';
const grant = buildAuthorityGrant({
  issuer: 'user:owner',
  subject: { type: 'agent', id: 'agent-flight' },
  principal_chain: [{ type: 'user', id: 'user:owner' }, { type: 'agent', id: 'agent-flight' }],
  capabilities: [{ actions: ['resource.read', 'resource.write'], resources: ['ruleoak://file/project/**'] }],
  not_before: now,
  expires_at: '2026-08-26T13:00:00.000Z',
  session_id: 'flight-session'
}, { secret, issuedAt: now });
writeAuthorityArtifact(dir, 'grant', grant.grant_id, grant);

const normalized = normalizeBoundedEnvelopeRequest({ grant_id: grant.grant_id, action: 'resource.write', resource: 'ruleoak://file/project/src/**', ttl_minutes: 15, max_executions: 2, max_objects: 20 }, new Date(now));
assert.equal(normalized.constraints.max_executions, 2);
assert.equal(normalized.constraints.network, 'deny');
assert.throws(() => normalizeBoundedEnvelopeRequest({ grant_id: grant.grant_id, action: 'resource.write', resource: 'x', ttl_minutes: 0 }, new Date(now)), /ttl_minutes/);

const created = createWorkspaceAuthorityEnvelope(dir, normalized, { secret, now });
assert.equal(created.envelope.grant_id, grant.grant_id);
assert.equal(readFlightState(dir).authority.envelopes.length, 1);
assert.throws(() => createWorkspaceAuthorityEnvelope(dir, { ...normalized, capabilities: [{ id: 'bad', actions: ['resource.delete'], resources: ['ruleoak://file/project/**'] }] }, { secret, now }), /exceeds authority grant/);
assert.throws(() => createWorkspaceAuthorityEnvelope(dir, normalized, {}), /signing secret/);

let approved = null;
const h = createFlightControlServer(dir, {
  now,
  decideApproval: (id, d) => { approved = { id, d }; return approved; },
  previewEnvelope: spec => previewWorkspaceAuthorityEnvelope(dir, spec, { secret, now }),
  createEnvelope: spec => createWorkspaceAuthorityEnvelope(dir, spec, { secret, now })
});
const a = await h.start();
const first = await fetch(a.url, { redirect: 'manual' });
assert.equal(first.status, 302);
const cookie = first.headers.get('set-cookie').split(';')[0];
const state = await fetch(`http://${a.host}:${a.port}/api/state`, { headers: { cookie } });
assert.equal(state.status, 200);
const s = await state.json();
assert.ok(s.csrf);

const headers = { cookie, 'content-type': 'application/json', 'x-ruleoak-csrf': s.csrf, origin: `http://${a.host}:${a.port}` };
const previewResponse = await fetch(`http://${a.host}:${a.port}/api/envelope/preview`, { method: 'POST', headers, body: JSON.stringify({ grant_id: grant.grant_id, action: 'resource.write', resource: 'ruleoak://file/project/test/**', ttl_minutes: 5, max_executions: 1 }) });
assert.equal(previewResponse.status, 200);
const previewBody = await previewResponse.json();
assert.equal(previewBody.preview.ok, true);
assert.equal(readFlightState(dir).authority.envelopes.length, 1, 'preview must not persist an envelope');

const envResponse = await fetch(`http://${a.host}:${a.port}/api/envelope`, { method: 'POST', headers, body: JSON.stringify({ grant_id: grant.grant_id, action: 'resource.write', resource: 'ruleoak://file/project/test/**', ttl_minutes: 5, max_executions: 1 }) });
assert.equal(envResponse.status, 200);
const envBody = await envResponse.json();
assert.equal(envBody.envelope.grant_id, grant.grant_id);

const outOfScope = await fetch(`http://${a.host}:${a.port}/api/envelope`, { method: 'POST', headers, body: JSON.stringify({ grant_id: grant.grant_id, action: 'resource.write', resource: 'ruleoak://file/outside/**', ttl_minutes: 5 }) });
assert.equal(outOfScope.status, 400);

const blocked = await fetch(`http://${a.host}:${a.port}/api/revoke`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'execution_lease', id: 'l' }) });
assert.equal(blocked.status, 403);
const ok = await fetch(`http://${a.host}:${a.port}/api/revoke`, { method: 'POST', headers, body: JSON.stringify({ type: 'execution_lease', id: 'l' }) });
assert.equal(ok.status, 200);
await h.close();

const hung=createFlightControlServer(dir,{now,callbackTimeoutMs:75,decideApproval:async()=>new Promise(()=>{}),previewEnvelope:spec=>previewWorkspaceAuthorityEnvelope(dir,spec,{secret,now}),createEnvelope:spec=>createWorkspaceAuthorityEnvelope(dir,spec,{secret,now})});const ha=await hung.start();const hf=await fetch(ha.url,{redirect:'manual'});const hc=hf.headers.get('set-cookie').split(';')[0];const hstate=await fetch(`http://${ha.host}:${ha.port}/api/state`,{headers:{cookie:hc}});const hjson=await hstate.json();const appJs=await fetch(`http://${ha.host}:${ha.port}/app.js`,{headers:{cookie:hc}});assert.match(await appJs.text(),/AbortController/,'Flight Control browser requests must have a deadline');const started=Date.now();const hresp=await fetch(`http://${ha.host}:${ha.port}/api/approve`,{method:'POST',headers:{cookie:hc,'content-type':'application/json','x-ruleoak-csrf':hjson.csrf,origin:`http://${ha.host}:${ha.port}`},body:JSON.stringify({id:'hung',decision:'deny_once'})});assert.equal(hresp.status,504);assert.ok(Date.now()-started<1500,'hung Flight Control callbacks must have a bounded exit');await hung.close();

console.log('Flight Control bounded-authority tests passed');
