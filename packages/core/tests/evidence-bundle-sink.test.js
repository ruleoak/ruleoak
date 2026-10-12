/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {EvidenceSinkRegistry,LocalFileEvidenceSink,validateEvidenceSinkDescriptor} from '../src/index.js';

const descriptor={sink_spi_version:'1.0',sink_id:'fixture',network:'none',accepted_profiles:['minimal']};
assert.equal(validateEvidenceSinkDescriptor(descriptor).valid,true);
assert.equal(validateEvidenceSinkDescriptor({...descriptor,accepted_profiles:['invalid']}).valid,false);
const dir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-sink-'));
try{
  const bytes=Buffer.from('immutable-bundle-bytes');const before=createHash('sha256').update(bytes).digest('hex');
  const manifest={bundle_version:'3.0',bundle_id:'sha256:'+'a'.repeat(64),created_at:'2026-08-27T00:00:00.000Z',privacy_profile:'minimal',source:{evidence_sha256:'sha256:'+'b'.repeat(64),event_count:0,final_hash:'GENESIS',first_event_at:null,last_event_at:null,chain_verified_at_export:true,raw_evidence_included:false},graphs:{authority_graph_id:'sha256:'+'c'.repeat(64),evidence_graph_id:'sha256:'+'d'.repeat(64)},adapters:[],files:[{path:'evidence/minimal.jsonl',size:0,sha256:'sha256:'+'e'.repeat(64),role:'minimal_timeline'}],verification:{source_chain:'verified_at_export_only',graphs:'verified_at_export_only',instructions:['verify']},privacy:{includes_raw_evidence:false,includes_policy:false,includes_workspace_state:false,includes_approval_state:false,includes_session_state:false}};
  const registry=new EvidenceSinkRegistry();
  registry.register(new LocalFileEvidenceSink(dir).asSink());
  registry.register({descriptor:{sink_spi_version:'1.0',sink_id:'mutating-sink',network:'none',accepted_profiles:['minimal']},implementation:{write({bytes}){bytes.fill(0);return{mutated_copy:true};}}});
  registry.register({descriptor:{sink_spi_version:'1.0',sink_id:'failing-sink',network:'required',accepted_profiles:['minimal']},implementation:{write(){throw new Error('synthetic sink outage');}}});
  await assert.rejects(()=>registry.deliver({bytes,manifest:{privacy_profile:'minimal'}},{source:'test'}),/invalid evidence bundle manifest/);
  const results=await registry.deliver({bytes,manifest},{source:'test'});
  assert.equal(results.length,3);
  assert.equal(results.find(x=>x.sink_id==='local-file-evidence-sink').ok,true);
  assert.equal(results.find(x=>x.sink_id==='failing-sink').ok,false);
  assert.match(results.find(x=>x.sink_id==='failing-sink').error,/synthetic sink outage/);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),before,'sink delivery must not mutate local bundle bytes');
  const local=results.find(x=>x.sink_id==='local-file-evidence-sink').response;
  assert.deepEqual(readFileSync(local.path),bytes);
  console.log('Evidence Bundle & Sink core tests passed');
}finally{rmSync(dir,{recursive:true,force:true});}
