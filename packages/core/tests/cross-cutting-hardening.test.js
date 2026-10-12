/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  EvidenceRecorder, verifyEvidence, buildCapabilityManifest, validateCapabilityIntelligenceIntegrity,
  buildPublicCapabilityIndex, FileCapabilityHistoryStore
} from '../src/index.js';

const dir=mkdtempSync(join(tmpdir(),'ruleoak-cross-hardening-'));
const evidence=join(dir,'evidence.jsonl');
const worker=`import {EvidenceRecorder} from ${JSON.stringify(new URL('../src/index.js',import.meta.url).href)};const r=new EvidenceRecorder(process.argv[1]);for(let i=0;i<20;i++)r.append({type:'custom.read',target:'x'+process.pid+'-'+i},{action:'allow',reason:'test'},new Date(1760000000000+i).toISOString());`;
function runWorker(){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',worker,evidence],{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(stderr||`worker exited ${code}`)));});}
await Promise.all([runWorker(),runWorker()]);
const events=readFileSync(evidence,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert.equal(events.length,40);assert.equal(verifyEvidence(events).ok,true,'cross-process recorder append must preserve evidence chain');
assert.throws(()=>new EvidenceRecorder(join(dir,'bad.jsonl')).append({type:'x',target:'y'},{action:'allow',reason:'x'},'not-a-time'),/valid date-time/);

const manifest=buildCapabilityManifest({identity:{name:'demo',integration_id:'sha256:'+'1'.repeat(64),identity_basis:'explicit'},tools:[{name:'repo.read',inputSchema:{type:'object'},readOnlyHint:true}],transport:'stdio',provenance:{source_kind:'local-manifest',mutability:'local-file-controlled-by-user'}},{observedAt:'2026-08-27T05:00:00.000Z'});
assert.equal(validateCapabilityIntelligenceIntegrity(manifest).valid,true);
const tampered=structuredClone(manifest);tampered.tools[0].evidence.evidence_id='sha256:'+'f'.repeat(64);
assert.equal(validateCapabilityIntelligenceIntegrity(tampered).valid,false);
assert.throws(()=>buildPublicCapabilityIndex([{manifest:tampered,observed_at:'2026-08-27T05:00:00.000Z'}],{generatedAt:'2026-08-27T05:00:00.000Z'}),/integrity|evidence/i);

const historyFile=join(dir,'history.jsonl');const store=new FileCapabilityHistoryStore(historyFile);
store.observe(manifest,{observedAt:'2026-08-27T05:00:00.000Z'});
const first=store.load();assert.ok(first.length>0);
const line=JSON.parse(readFileSync(historyFile,'utf8').split(/\r?\n/).filter(Boolean)[0]);line.snapshot.state='state_changing';
const badFile=join(dir,'history-bad.jsonl');await import('node:fs').then(fs=>fs.writeFileSync(badFile,JSON.stringify(line)+'\n'));
assert.throws(()=>new FileCapabilityHistoryStore(badFile).load(),/digest mismatch|invalid/i);

console.log('Cross-cutting hardening tests passed');
