/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalFamilyJson, validateEvidenceEnvelope, validateFamilyRegistry} from '@ruleoak/protocol/family';
import {familyJsonSha256 as sha, sealEvidenceEnvelope as seal, assessEvidenceEnvelope as assess, resolveFamilyRelease as resolve, verifyFamilyPackageSet, assessFamilyQualification, assessFamilyCompatibility, resolveFamilyDependencySet} from '@ruleoak/core/family';
let count=0;
function test(name, fn) { fn(); count++; }
const h='a'.repeat(64), now='2026-09-13T00:00:00.000Z', end='2026-09-14T00:00:00.000Z';
const producer={product:'fixture',releaseId:'fixture-release-1',sourceSha256:h}, subject={kind:'workload',id:'support',sha256:h};
const unsigned={schemaVersion:'1.0',id:'fixture-1',producer,subject,scope:'support/en/v1',payloadSchema:{id:'fixture',version:'1'},payload:{reviewed:true},sources:[{id:'document',originalSha256:h,extractionSha256:null}],createdAt:now,expiresAt:end,claims:[{dimension:'human_review',assertion:'supported',verifierId:'reviewer',evidenceSha256:h}]};
const envelope=seal(unsigned);
const options={now,expectedSubject:subject,expectedScope:unsigned.scope,revokedEnvelopeIds:[],revocationCheckedAt:now,revocationValidUntil:end,acceptProducer:p=>p.sourceSha256===h,payloadValidators:new Map([['fixture@1',p=>p.reviewed===true]]),verifyClaim:c=>c.dimension==='human_review' && c.evidenceSha256===h};
const clone=x=>JSON.parse(JSON.stringify(x));
const release={ref:producer,version:'0.50.0',sourceArtifact:'fixture.zip',availability:'available',packages:[{name:'fixture',version:'0.50.0',artifactSha256:h}],schemas:[],dependencies:[],qualification:[{kind:'source_tests',platform:'linux-node',sourceSha256:h,artifactSha256:h,checkedAt:now,expiresAt:end,verifierId:'local'}]};
const registry={schemaVersion:'1.0',releases:[release]};
test('valid contract',()=>assert.equal(validateEvidenceEnvelope(envelope).valid,true));
test('review is not semantic support',()=>{const r=assess(envelope,options);assert.equal(r.valid,true);assert.equal(r.integrity,'matched');assert.equal(r.dimensions.human_review,'supported');assert.equal(r.dimensions.semantic_support,'not_established');assert.equal(r.authorityTransferred,false);});
for(const dimension of ['binding','semantic_support','workload_qualification','effect_confirmation','human_review']) {
 test('untrusted '+dimension,()=>{const e=seal({...unsigned,claims:[{...unsigned.claims[0],dimension}]}); assert.equal(assess(e,{...options,verifyClaim:undefined}).dimensions[dimension],'not_established');});
 test('no promotion from '+dimension,()=>{const e=seal({...unsigned,claims:[{...unsigned.claims[0],dimension}]});const r=assess(e,{...options,verifyClaim:()=>true});for(const d of Object.keys(r.dimensions))assert.equal(r.dimensions[d],d===dimension?'supported':'not_established');});
}
for(const [name,change] of [
 ['payload',e=>e.payload.reviewed=false],['subject',e=>e.subject.id='other'],['scope',e=>e.scope='other'],['producer',e=>e.producer.releaseId='fixture-release-2'],['source',e=>e.sources[0].originalSha256='b'.repeat(64)],['claim',e=>e.claims[0].verifierId='attacker'],['expiry',e=>e.expiresAt='2027-01-01T00:00:00.000Z']
])test('tamper '+name,()=>{const e=clone(envelope);change(e);assert.equal(assess(e,options).valid,false);});
for(const [name,patch] of [
 ['stale revocations',{revocationValidUntil:now}],['missing revocation freshness',{revocationCheckedAt:undefined}],['expired',{now:end}],['future',{now:'2026-09-12T00:00:00.000Z'}],['missing time',{now:undefined}],['revoked',{revokedEnvelopeIds:['fixture-1']}],['missing revocations',{revokedEnvelopeIds:undefined}],['unknown producer',{acceptProducer:()=>false}],['scope replay',{expectedScope:'other'}],['subject replay',{expectedSubject:{...subject,sha256:'b'.repeat(64)}}],['unknown payload',{payloadValidators:new Map()}],['async validator',{payloadValidators:new Map([['fixture@1',async()=>true]])}],['throwing producer',{acceptProducer:()=>{throw Error('offline')}}]
])test(name,()=>assert.equal(assess(envelope,{...options,...patch}).valid,false));
test('status words cannot create semantic truth',()=>{const e=seal({...unsigned,payload:{reviewed:true,status:'VERIFIED',decision:'RECOMMENDATION_ALLOWED'}});assert.equal(assess(e,options).dimensions.semantic_support,'not_established');});
test('contradiction preserved',()=>{const e=seal({...unsigned,claims:[{...unsigned.claims[0],assertion:'contradicted'}]});assert.equal(assess(e,options).dimensions.human_review,'contradicted');});
test('claims callback cannot mutate envelope',()=>{const r=assess(envelope,{...options,verifyClaim:(c,e)=>{e.subject.id='other';return true;}});assert.equal(r.dimensions.human_review,'not_established');assert.equal(envelope.subject.id,'support');});
test('Promise is not approval',()=>assert.equal(assess(envelope,{...options,verifyClaim:async()=>true}).dimensions.human_review,'not_established'));
for(const value of [undefined,NaN,Infinity,-0,1n,new Date(),new Map(),[,1],Object.assign([1],{extra:1}),{get x(){throw Error('must not run')}},Object.create({x:1}),{x:'\ud800'}])test('reject non-JSON '+count,()=>assert.throws(()=>canonicalFamilyJson(value)));
test('cycle rejected',()=>{const x={};x.x=x;assert.throws(()=>canonicalFamilyJson(x));});
test('depth bounded',()=>{let x={};for(let i=0;i<40;i++)x={x};assert.throws(()=>canonicalFamilyJson(x));});
test('string bounded',()=>assert.throws(()=>canonicalFamilyJson('a'.repeat(1000001))));
test('canonical order',()=>assert.equal(sha({z:1,a:2}),sha({a:2,z:1})));
test('registry validated',()=>assert.equal(validateFamilyRegistry(registry).valid,true));
test('pinned registry resolve',()=>assert.equal(resolve(registry,producer,sha(registry)).ref.releaseId,'fixture-release-1'));
test('unpinned registry rejected',()=>assert.throws(()=>resolve(registry,producer,undefined)));
test('registry tampering',()=>assert.throws(()=>resolve({...registry,releases:[]},producer,sha(registry))));
test('version-only resolution rejected',()=>assert.throws(()=>resolve(registry,{product:'fixture',version:'0.50.0'},sha(registry))));
test('same version substituted source rejected',()=>assert.throws(()=>resolve(registry,{...producer,sourceSha256:'b'.repeat(64)},sha(registry))));
test('exact package set',()=>assert.equal(verifyFamilyPackageSet(release,release.packages),true));
test('same-version package substitution',()=>assert.equal(verifyFamilyPackageSet(release,[{...release.packages[0],artifactSha256:'b'.repeat(64)}]),false));
test('extra package rejected',()=>assert.equal(verifyFamilyPackageSet(release,[...release.packages,{...release.packages[0],name:'extra'}]),false));
test('missing dependency rejected',()=>assert.equal(validateFamilyRegistry({schemaVersion:'1.0',releases:[{...release,dependencies:[{...producer,releaseId:'missing'}]}]}).valid,false));
test('duplicate release rejected',()=>assert.equal(validateFamilyRegistry({...registry,releases:[release,release]}).valid,false));
const qopts={kind:'source_tests',platform:'linux-node',now,verifyEvidence:()=>true};
test('scoped source qualification',()=>assert.equal(assessFamilyQualification(release,qopts),true));
test('source tests never native',()=>assert.equal(assessFamilyQualification(release,{...qopts,kind:'native_runtime'}),false));
test('stale qualification',()=>assert.equal(assessFamilyQualification(release,{...qopts,now:end}),false));
test('untrusted qualification',()=>assert.equal(assessFamilyQualification(release,{...qopts,verifyEvidence:undefined}),false));
test('reference archive not available',()=>assert.equal(assessFamilyQualification({...release,availability:'reference_only'},qopts),false));
const record={schemaVersion:'1.0',consumer:producer,dependency:{...producer,product:'dependency'},adapterVersion:'1',platform:'linux-node',suiteSha256:h,resultSha256:h,checkedAt:now,expiresAt:end,verifierId:'local',outcome:'pass'};
const copts={consumer:record.consumer,dependency:record.dependency,adapterVersion:'1',platform:'linux-node',suiteSha256:h,now,verifyEvidence:()=>true};
test('exact compatibility',()=>assert.equal(assessFamilyCompatibility(record,copts),true));
for(const [name,patch] of [['adapter',{adapterVersion:'2'}],['platform',{platform:'macos'}],['suite',{suiteSha256:'b'.repeat(64)}],['stale',{now:end}],['untrusted',{verifyEvidence:undefined}],['dependency',{dependency:{...record.dependency,sourceSha256:'b'.repeat(64)}}]])test('compatibility '+name,()=>assert.equal(assessFamilyCompatibility(record,{...copts,...patch}),false));
test('dependency closure',()=>assert.equal(resolveFamilyDependencySet(registry,producer,sha(registry)).length,1));
test('dependency cycle rejected',()=>{const r={schemaVersion:'1.0',releases:[{...release,dependencies:[producer]}]};assert.throws(()=>resolveFamilyDependencySet(r,producer,sha(r)),/dependency_cycle/);});
test('malformed qualification fails closed',()=>assert.equal(assessFamilyQualification({},qopts),false));
test('rejected async verifier remains untrusted',()=>assert.equal(assess(envelope,{...options,verifyClaim:async()=>{throw Error('offline verifier');}}).dimensions.human_review,'not_established'));
await new Promise(resolve=>setImmediate(resolve));
const corpus=JSON.parse(readFileSync(new URL('../../protocol/conformance/family-corpus.json',import.meta.url),'utf8'));
for(const item of corpus.cases)test('portable corpus '+item.id,()=>assert.equal(validateEvidenceEnvelope(item.envelope).valid,item.structurallyValid));
console.log(`family conformance PASS: ${count} cases`);
