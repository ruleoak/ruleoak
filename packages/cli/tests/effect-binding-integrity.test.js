/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { canonicalDigest } from '@ruleoak/core';
import { runWrapped } from '../src/cli.js';
import { reverifyEffect } from '../src/effect-state.js';

function sink(){return new Writable({write(_c,_e,cb){cb();}});}
const root=mkdtempSync(join(tmpdir(),'ruleoak-effect-binding-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});
writeFileSync(join(root,'.ruleoak','policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'allow-write',effect:'allow',actions:['mcp.write_file'],resources:['*'],priority:100}]},null,2));
const target=join(root,'committed.txt'),server=join(root,'server.mjs');
writeFileSync(server,`import {writeFileSync} from 'node:fs';let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const m=JSON.parse(s);writeFileSync(${JSON.stringify(target)},String(m.params.arguments.content));process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{ok:true}}));});`);
await runWrapped([process.execPath,server],root,{inputChunks:[JSON.stringify({jsonrpc:'2.0',id:61,method:'tools/call',params:{name:'write_file',arguments:{path:target,content:'committed'}}})],stdout:sink(),stderr:sink(),effectBoundary:true,effectProfile:'local-filesystem',effectRoots:[root]});
const resolvedDir=join(root,'.ruleoak','effects','resolved'),file=readdirSync(resolvedDir).find(n=>n.endsWith('.json'));assert.ok(file);const path=join(resolvedDir,file);const original=JSON.parse(readFileSync(path,'utf8'));const id=original.effect_receipt.effect_id;assert.match(original.effect_binding_digest,/^sha256:/);

const tampered={...original,verifier_spec:{...original.verifier_spec,path:join(root,'other.txt')}};writeFileSync(path,JSON.stringify(tampered,null,2));
assert.throws(()=>reverifyEffect(root,id),/binding digest mismatch/);

tampered.effect_binding_digest=canonicalDigest({effect_profile:tampered.effect_profile||null,effect_contract:tampered.effect_contract||null,verifier_spec:tampered.verifier_spec||null});writeFileSync(path,JSON.stringify(tampered,null,2));
assert.throws(()=>reverifyEffect(root,id),/not anchored in the verified evidence chain/);
const leaseTampered=JSON.parse(JSON.stringify(original));leaseTampered.execution_lease.lease_id='lease_tampered';writeFileSync(path,JSON.stringify(leaseTampered,null,2));assert.throws(()=>reverifyEffect(root,id),/not anchored in the verified evidence chain/);
console.log('Effect verifier binding integrity tests passed');
