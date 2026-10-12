/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildCapabilityManifest, observeCapabilityManifest, queryCapabilityHistory, FileCapabilityHistoryStore, verifyCapabilityObservationDigest, isPublicationSafeCapabilityObservation } from '../src/index.js';

const t1='2026-08-27T01:00:00.000Z',t2='2026-08-27T02:00:00.000Z',t3='2026-08-27T03:00:00.000Z',t4='2026-08-27T04:00:00.000Z';
const opts={name:'Demo MCP',transport:'stdio',identityKey:'com.example/demo',sourceKind:'local-process',sourceDigest:'sha256:v1',version:'1.0.0'};
const m1=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}},{name:'repo.write',annotations:{readOnlyHint:false},inputSchema:{type:'object'}}]}, {...opts,observedAt:t1});
const o1=observeCapabilityManifest([],m1,{observedAt:t1});
assert.equal(o1.length,2);assert.ok(o1.every(o=>o.lifecycle_state==='first_seen'));assert.ok(o1.every(o=>o.drift_categories.includes('capability_expansion')));
const o1b=observeCapabilityManifest([],m1,{observedAt:t1});assert.deepEqual(o1,o1b,'observation digest must be deterministic');

const m2=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{q:{type:'string'}}}},{name:'repo.write',annotations:{readOnlyHint:false,destructiveHint:true},inputSchema:{type:'object'}}]}, {...opts,sourceDigest:'sha256:v2',version:'1.1.0',observedAt:t2});
const o2=observeCapabilityManifest(o1,m2,{observedAt:t2,previousManifest:m1});
const read2=o2.find(o=>o.action_name==='repo.read');assert.equal(read2.lifecycle_state,'present');assert.ok(read2.drift_categories.includes('schema_change'));assert.ok(read2.drift_categories.includes('provenance_change'));
const write2=o2.find(o=>o.action_name==='repo.write');assert.ok(write2.drift_categories.includes('consequence_escalation'));

const m3=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{q:{type:'string'}}}}]}, {...opts,sourceDigest:'sha256:v3',version:'1.2.0',observedAt:t3});
const h2=[...o1,...o2];const o3=observeCapabilityManifest(h2,m3,{observedAt:t3,previousManifest:m2});
const removed=o3.find(o=>o.action_name==='repo.write');assert.equal(removed.lifecycle_state,'removed');assert.ok(removed.drift_categories.includes('capability_contraction'));

const m4=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{q:{type:'string'}}}},{name:'repo.write',annotations:{readOnlyHint:false},inputSchema:{type:'object'}}]}, {...opts,sourceDigest:'sha256:v4',version:'1.3.0',observedAt:t4});
const h3=[...h2,...o3];const o4=observeCapabilityManifest(h3,m4,{observedAt:t4,previousManifest:m3});
const re=o4.find(o=>o.action_name==='repo.write');assert.equal(re.lifecycle_state,'reintroduced');assert.ok(re.drift_categories.includes('capability_expansion'));
assert.equal(queryCapabilityHistory([...h3,...o4],{lifecycleState:'removed'}).length,1);
assert.ok(queryCapabilityHistory([...h3,...o4],{driftCategory:'consequence_escalation'}).length>=1);

const dir=mkdtempSync(join(tmpdir(),'ruleoak-history-'));const file=join(dir,'history.jsonl');const store=new FileCapabilityHistoryStore(file,{maxBytes:1024*1024,maxLineBytes:32768,maxObservations:100});
let r=store.append(o1);assert.equal(r.appended,2);r=store.append(o1);assert.equal(r.appended,0);assert.equal(r.duplicates,2);assert.equal(store.load().length,2);
store.append(o2);assert.equal(store.load().length,4);assert.ok(readFileSync(file,'utf8').endsWith('\n'));
writeFileSync(join(dir,'bad.jsonl'),'{bad json}\n');assert.throws(()=>new FileCapabilityHistoryStore(join(dir,'bad.jsonl')).load(),/corrupt capability history JSON at line 1/);
writeFileSync(join(dir,'too-many.jsonl'),readFileSync(file,'utf8'));assert.throws(()=>new FileCapabilityHistoryStore(join(dir,'too-many.jsonl'),{maxObservations:1}).load(),/maxObservations/);


// Observation timestamp alone is not drift metadata.
const sameLater=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}},{name:'repo.write',annotations:{readOnlyHint:false},inputSchema:{type:'object'}}]}, {...opts,observedAt:'2026-08-27T01:30:00.000Z'});
const sameLaterObs=observeCapabilityManifest(o1,sameLater,{observedAt:'2026-08-27T01:30:00.000Z',previousManifest:m1});
assert.ok(sameLaterObs.every(o=>o.drift_categories.length===0));
assert.ok(sameLaterObs.every(o=>o.snapshot.evidence.observed_at==='2026-08-27T01:30:00.000Z'));

// Broken parent chains fail explicitly.
const broken={...o2[0],observation_id:'sha256:'+'1'.repeat(64),previous_observation_id:'sha256:'+'2'.repeat(64)};
const brokenFile=join(dir,'broken.jsonl');writeFileSync(brokenFile,[...o1,broken].map(x=>JSON.stringify(x)).join('\n')+'\n');
assert.throws(()=>new FileCapabilityHistoryStore(brokenFile).load(),/digest mismatch|previous_observation_id does not match/);
const tamperedFile=join(dir,'tampered.jsonl');const tampered={...o1[0],action_name:'tampered'};writeFileSync(tamperedFile,JSON.stringify(tampered)+'\n');assert.throws(()=>new FileCapabilityHistoryStore(tamperedFile).load(),/digest mismatch/);

// Publication-safe observation: raw descriptions/schemas/paths are absent.
const bytes=JSON.stringify(o2);assert.ok(!bytes.includes('description'));assert.ok(!bytes.includes('inputSchema'));assert.ok(!bytes.includes('/private/example/source-path'));


// Observation digest detects tampering even when the ID shape remains valid.
assert.equal(verifyCapabilityObservationDigest(o1[0]),true);
assert.equal(verifyCapabilityObservationDigest({...o1[0],action_name:'tampered'}),false);
assert.equal(isPublicationSafeCapabilityObservation(o1[0]),true);
const unsafeBasis={...o1[0],snapshot:{...o1[0].snapshot,classification_basis:{...o1[0].snapshot.classification_basis,prompt:'private'}}};
assert.equal(isPublicationSafeCapabilityObservation(unsafeBasis),false);

// Histories may contain multiple integrations without cross-integration removals.
const other=buildCapabilityManifest({tools:[{name:'calendar.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]}, {name:'Other MCP',transport:'stdio',identityKey:'com.example/other',sourceKind:'local-process',sourceDigest:'sha256:other',version:'1.0.0',observedAt:t1});
const otherObs=observeCapabilityManifest([],other,{observedAt:t1});
const mixedHistory=[...o1,...otherObs];
const mixedNext=observeCapabilityManifest(mixedHistory,m2,{observedAt:t2,previousManifest:m1});
assert.ok(!mixedNext.some(o=>o.action_name==='calendar.read'));

// Evidence digest must match the historical evidence payload rather than the earlier source observation.
assert.notEqual(o1[0].snapshot.evidence.evidence_id,m1.tools.find(t=>t.capability_id===o1[0].capability_id).evidence.evidence_id);
assert.ok(o1[0].snapshot.evidence.evidence_classes.includes('historical_observation'));

// Out-of-order non-duplicate observations are rejected because append order drives lifecycle reconstruction.
const older=observeCapabilityManifest(o1,m2,{observedAt:'2026-08-27T00:30:00.000Z',previousManifest:m1});
assert.throws(()=>store.append(older),/not later than existing history/);

// A transport change is explicit expansion/contraction rather than identity mutation.
const http=buildCapabilityManifest({tools:[{name:'repo.read',annotations:{readOnlyHint:true},inputSchema:{type:'object'}}]}, {...opts,transport:'streamable-http',sourceKind:'remote-service',sourceDigest:'sha256:http',version:'2.0.0',observedAt:'2026-08-27T05:00:00.000Z'});
const transportObs=observeCapabilityManifest(o1,http,{observedAt:'2026-08-27T05:00:00.000Z',previousManifest:m1});
assert.ok(transportObs.some(o=>o.lifecycle_state==='first_seen'&&o.drift_categories.includes('transport_change')&&o.drift_categories.includes('capability_expansion')));
assert.ok(transportObs.some(o=>o.lifecycle_state==='removed'&&o.drift_categories.includes('transport_change')&&o.drift_categories.includes('capability_contraction')));

console.log('capability history tests passed');
