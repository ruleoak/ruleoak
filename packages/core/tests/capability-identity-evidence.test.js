/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {
  buildCapabilityIdentity,
  buildCapabilityEvidence,
  buildCapabilityManifest,
  migrateCapabilityManifestToV12,
  diffCapabilityManifests,
  sanitizePublicCapabilityEvidence,
  sanitizePublicCapabilityIdentity
} from '../src/index.js';

const observedAt='2026-08-27T03:30:00.000Z';
const idV1=buildCapabilityIdentity({name:'Demo MCP',action_name:'repo.read',transport:'stdio'},{identityKey:'com.example/demo'});
const idV2=buildCapabilityIdentity({name:'Demo MCP',action_name:'repo.read',transport:'stdio',version:'9.9.9'},{identityKey:'com.example/demo'});
assert.equal(idV1.integration_id,idV2.integration_id,'version must not change integration identity');
assert.equal(idV1.capability_id,idV2.capability_id,'version must not change capability identity');
const renamed=buildCapabilityIdentity({name:'Demo MCP',action_name:'repository.read',transport:'stdio'},{identityKey:'com.example/demo'});
assert.notEqual(idV1.capability_id,renamed.capability_id,'renamed action must receive a new capability identity');

const evidence=buildCapabilityEvidence({classification_basis:{state:'inferred:tool-name'},provenance:{source_kind:'remote-service',mutability:'remote-can-change-without-local-update',source_digest:'sha256:abc'}},{observedAt});
assert.deepEqual(evidence.evidence_classes,['runtime_discovery','inferred_classification']);
assert.equal(evidence.observed_at,observedAt);
assert.equal('source' in evidence && 'locator' in evidence.source,false);
assert.deepEqual(sanitizePublicCapabilityEvidence(evidence),evidence);
assert.deepEqual(sanitizePublicCapabilityIdentity(idV1),idV1);

const baseTools=[{name:'repo.read',inputSchema:{type:'object'},annotations:{readOnlyHint:true}}];
const a=buildCapabilityManifest({name:'Demo MCP',version:'1.0.0',tools:baseTools},{identityKey:'com.example/demo',sourceDigest:'sha256:one',observedAt});
const b=buildCapabilityManifest({name:'Demo MCP',version:'2.0.0',tools:baseTools},{identityKey:'com.example/demo',sourceDigest:'sha256:two',observedAt:'2026-08-28T03:30:00.000Z'});
assert.equal(a.manifest_version,'1.2');
assert.equal(a.identity.integration_id,b.identity.integration_id);
assert.equal(a.tools[0].capability_id,b.tools[0].capability_id);
assert.equal(a.fingerprint,b.fingerprint,'routine version/source digest/observation time must not change capability-surface fingerprint');
assert.notEqual(a.tools[0].evidence.evidence_id,b.tools[0].evidence.evidence_id,'evidence observations should remain distinguishable');
const versionDiff=diffCapabilityManifests(a,b);
assert.equal(versionDiff.added.length,0);
assert.equal(versionDiff.removed.length,0);
assert.ok(versionDiff.identity_changes.includes('version'));
assert.ok(versionDiff.provenance_changes.includes('source_digest'));
assert.equal(versionDiff.capability_surface_changed,false);
assert.equal(versionDiff.metadata_changed,true);

const renamedManifest=buildCapabilityManifest({name:'Demo MCP',version:'2.1.0',tools:[{name:'repository.read',inputSchema:{type:'object'},annotations:{readOnlyHint:true}}]},{identityKey:'com.example/demo',observedAt});
const renameDiff=diffCapabilityManifests(a,renamedManifest);
assert.deepEqual(renameDiff.added.map(x=>x.name),['repository.read']);
assert.deepEqual(renameDiff.removed.map(x=>x.name),['repo.read']);
assert.equal(renameDiff.capability_surface_changed,true);

const legacy={manifest_version:'1.1',identity:{name:'Legacy',version:'1.0.0',source:'/private/path/tools.json',transport:'manifest',protocol_version:null,remote:false},provenance:{source_kind:'local-manifest',mutability:'local-file-controlled-by-user',source_digest:'sha256:legacy',declared_version:'1.0.0',protocol_version:null},tools:[{name:'repo.read',description:'do not publish me',state:'read_only',consequence:'read_only',secret_or_identity_related:false,schema_digest:'sha256:schema',annotations:{readOnlyHint:true},classification_basis:{state:'declared:readOnlyHint=true',consequence:'derived:read-only'}}],summary:{total:1},trust_notes:[],fingerprint:'sha256:legacy'};
const migrated=migrateCapabilityManifestToV12(legacy,{identityKey:'legacy.demo',observedAt});
assert.equal(migrated.manifest_version,'1.2');
assert.match(migrated.identity.integration_id,/^sha256:[a-f0-9]{64}$/);
assert.match(migrated.tools[0].capability_id,/^sha256:[a-f0-9]{64}$/);
assert.equal(migrated.tools[0].evidence.observed_at,observedAt);
assert.equal(JSON.stringify(migrated.tools[0].evidence).includes('/private/path'),false);
assert.throws(()=>migrateCapabilityManifestToV12({...migrated,identity:{...migrated.identity,integration_id:'broken'}}),/invalid Capability Manifest v1.2/);
console.log('Capability identity/evidence tests passed');
