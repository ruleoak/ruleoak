/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {buildCapabilityManifest,buildPublicCapabilityIndex,sanitizePublicCapabilityManifest,stablePublicIntegrationSlug,evidenceSourceLabels,observeCapabilityManifest} from '../src/index.js';

const m1=buildCapabilityManifest({name:'Example MCP',version:'1.0.0',source:'https://user:pass@example.test/mcp?token=SECRET#frag',remote:true,tools:[{name:'repo.read',description:'private wording',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]},{remote:true,transport:'http',identityKey:'example.mcp',observedAt:'2026-08-01T00:00:00Z'});
const m2=buildCapabilityManifest({name:'Example MCP Renamed',version:'1.1.0',source:'https://example.test/mcp?private=SECRET',remote:true,tools:[{name:'repo.read',description:'private wording changed',annotations:{readOnlyHint:true},inputSchema:{type:'object'}},{name:'repo.delete',description:'do not publish this description',annotations:{readOnlyHint:false,destructiveHint:true},inputSchema:{type:'object',properties:{token:{type:'string'}}}}]},{remote:true,transport:'http',identityKey:'example.mcp',observedAt:'2026-08-20T00:00:00Z'});
const safe=sanitizePublicCapabilityManifest(m2);
assert.equal(safe.tools[1].description,undefined);assert.equal(safe.tools[1].annotations,undefined);assert.ok(!JSON.stringify(safe).includes('do not publish'));
assert.equal(sanitizePublicCapabilityManifest(m1).identity.source,'https://example.test/mcp');
assert.ok(!JSON.stringify(sanitizePublicCapabilityManifest(m1)).includes('pass'));assert.ok(!JSON.stringify(sanitizePublicCapabilityManifest(m1)).includes('SECRET'));
assert.equal(stablePublicIntegrationSlug(m1),stablePublicIntegrationSlug(m2),'display-name change must not move canonical public URL');
const adversarial=JSON.parse(JSON.stringify(m2));adversarial.tools[0].evidence.source.source_digest='PRIVATE_SOURCE_DIGEST';adversarial.tools[0].classification_basis={...adversarial.tools[0].classification_basis,private_note:'DO_NOT_PUBLISH_BASIS'};adversarial.tools[0].evidence.classification_basis={...adversarial.tools[0].evidence.classification_basis,private_note:'DO_NOT_PUBLISH_EVIDENCE_BASIS'};adversarial.trust_notes=['DO_NOT_PUBLISH_TRUST_NOTE'];
const adversarialSafe=sanitizePublicCapabilityManifest(adversarial);const adversarialBytes=JSON.stringify(adversarialSafe);assert.ok(!adversarialBytes.includes('PRIVATE_SOURCE_DIGEST'));assert.ok(!adversarialBytes.includes('DO_NOT_PUBLISH_BASIS'));assert.ok(!adversarialBytes.includes('DO_NOT_PUBLISH_EVIDENCE_BASIS'));assert.ok(!adversarialBytes.includes('DO_NOT_PUBLISH_TRUST_NOTE'));assert.equal(adversarialSafe.tools[0].evidence.source.source_digest,null);
assert.deepEqual(evidenceSourceLabels(m1.tools[0].evidence),['Inspected','Inferred']);

let history=[];const h1=observeCapabilityManifest(history,m1,{observedAt:'2026-08-01T00:00:00Z'});history=[...history,...h1];const h2=observeCapabilityManifest(history,m2,{observedAt:'2026-08-20T00:00:00Z'});history=[...history,...h2];
const index=buildPublicCapabilityIndex([{manifest:m1,observed_at:'2026-08-01T00:00:00Z'},{manifest:m2,observed_at:'2026-08-20T00:00:00Z'}],{baseUrl:'https://ruleoak.com/inspector-index',generatedAt:'2026-08-21T00:00:00Z',historyObservations:history});
assert.equal(index.index_version,'2.0');assert.equal(index.integrations.length,1);assert.equal(index.integrations[0].name,'Example MCP Renamed');assert.equal(index.drift_events.length,1);assert.deepEqual(index.drift_events[0].added,['repo.delete']);assert.deepEqual(index.drift_events[0].authority_surface_broadened,['repo.delete']);
assert.equal(index.integrations[0].history.length,3);assert.ok(index.integrations[0].history_events.some(e=>e.action_name==='repo.delete'&&e.drift_categories.includes('capability_expansion')));
assert.equal(index.integrations[0].versions.length,2);assert.match(index.integrations[0].versions[0].key,/^version-1-0-0--[a-f0-9]{64}$/);
assert.equal(index.integrations[0].watch.integration_id,m2.identity.integration_id);assert.equal(index.integrations[0].watch.latest_fingerprint,m2.fingerprint);assert.equal(index.integrations[0].watch.action,'watch_integration');

const registry=buildCapabilityManifest({name:'Registry Only',version:'1.0.0',tools:[{name:'unknown.tool',inputSchema:{}}]},{sourceKind:'registry-metadata',evidenceClass:'registry_metadata',identityKey:'registry.only',observedAt:'2026-08-21T00:00:00Z'});
const registryIndex=buildPublicCapabilityIndex([{manifest:registry,observed_at:'2026-08-21T00:00:00Z'}]);
assert.equal(registryIndex.integrations[0].inspection_status,'registry_only');assert.ok(registryIndex.integrations[0].latest.tools[0].evidence_labels.includes('Registry metadata'));assert.ok(!registryIndex.integrations[0].latest.tools[0].evidence_labels.includes('Inspected'));

assert.throws(()=>buildPublicCapabilityIndex([{manifest:m1}],{baseUrl:'file:///tmp/index'}),/http\(s\)/);
assert.throws(()=>buildPublicCapabilityIndex([{manifest:m1}],{baseUrl:'https://user:pass@example.test/index'}),/credential-free/);
console.log('public Inspector index tests passed');

// Preserve stable-surface regression coverage.
const stableA=buildCapabilityManifest({name:'stable-demo',version:'1.0.0',tools:[{name:'repo.read',inputSchema:{},annotations:{readOnlyHint:true}}]},{identityKey:'stable.demo',sourceDigest:'sha256:a',observedAt:'2026-08-27T00:00:00.000Z'});
const stableB=buildCapabilityManifest({name:'stable-demo',version:'2.0.0',tools:[{name:'repo.read',inputSchema:{},annotations:{readOnlyHint:true}}]},{identityKey:'stable.demo',sourceDigest:'sha256:b',observedAt:'2026-08-28T00:00:00.000Z'});
const stableIndex=buildPublicCapabilityIndex([{manifest:stableA,observed_at:'2026-08-27T00:00:00.000Z'},{manifest:stableB,observed_at:'2026-08-28T00:00:00.000Z'}]);
assert.equal(stableIndex.drift_events.length,0);assert.equal(stableIndex.integrations[0].versions.length,2,'version timeline must preserve routine version upgrades even when surface is stable');
assert.match(stableIndex.integrations[0].latest.tools[0].capability_id,/^sha256:/);assert.deepEqual(stableIndex.integrations[0].latest.tools[0].evidence.evidence_classes,['declared_manifest','inferred_classification']);

// current hardening: retain latest evidence for identical version+surface snapshots.
const sameDeclared=buildCapabilityManifest({name:'same-surface',version:'1.0.0',tools:[{name:'repo.read',inputSchema:{},annotations:{readOnlyHint:true}}]},{identityKey:'same.surface',evidenceClass:'declared_manifest',observedAt:'2026-08-27T01:00:00.000Z'});
const sameInspected=buildCapabilityManifest({name:'same-surface',version:'1.0.0',tools:[{name:'repo.read',inputSchema:{},annotations:{readOnlyHint:true}}]},{identityKey:'same.surface',evidenceClass:'runtime_discovery',observedAt:'2026-08-27T02:00:00.000Z'});
assert.equal(sameDeclared.fingerprint,sameInspected.fingerprint,'evidence upgrades must not change the capability surface fingerprint');
const sameIndex=buildPublicCapabilityIndex([{manifest:sameDeclared,observed_at:'2026-08-27T01:00:00.000Z'},{manifest:sameInspected,observed_at:'2026-08-27T02:00:00.000Z'}]);
assert.equal(sameIndex.integrations[0].versions.length,1);
assert.equal(sameIndex.integrations[0].versions[0].inspection_status,'inspected','same-surface version page must retain the latest evidence representation');
assert.deepEqual(sameIndex.integrations[0].versions[0].evidence_labels,['Inspected','Inferred']);
assert.throws(()=>buildPublicCapabilityIndex([{manifest:m1,observed_at:'not-a-date'}]),/observed_at/);
assert.throws(()=>buildPublicCapabilityIndex([{manifest:m1}],{generatedAt:'DO_NOT_PUBLISH'}),/generated_at/);
const invalidManifest={...m1,manifest_version:'9.9'};
assert.throws(()=>buildPublicCapabilityIndex([{manifest:invalidManifest}]),/valid capability manifest/);

// Reversion histories must not collide on manifest-diff event IDs.
const m3=buildCapabilityManifest({name:'Example MCP Again',version:'1.2.0',source:'https://example.test/mcp',remote:true,tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]},{remote:true,transport:'http',identityKey:'example.mcp',observedAt:'2026-08-22T00:00:00Z'});
const m4=buildCapabilityManifest({name:'Example MCP Again',version:'1.3.0',source:'https://example.test/mcp',remote:true,tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}},{name:'repo.delete',annotations:{readOnlyHint:false,destructiveHint:true},inputSchema:{type:'object',properties:{token:{type:'string'}}}}]},{remote:true,transport:'http',identityKey:'example.mcp',observedAt:'2026-08-23T00:00:00Z'});
assert.equal(m2.fingerprint,m4.fingerprint,'repeated logical surface should reuse fingerprint');
const reversionIndex=buildPublicCapabilityIndex([{manifest:m1,observed_at:'2026-08-01T00:00:00Z'},{manifest:m2,observed_at:'2026-08-20T00:00:00Z'},{manifest:m3,observed_at:'2026-08-22T00:00:00Z'},{manifest:m4,observed_at:'2026-08-23T00:00:00Z'}]);
assert.equal(new Set(reversionIndex.drift_events.map(e=>e.event_id)).size,reversionIndex.drift_events.length,'manifest diff event IDs must remain unique across surface reversion');
