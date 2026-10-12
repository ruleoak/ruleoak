/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { EvidenceRecorder } from '@ruleoak/core';
import { runWrapped } from '../src/cli.js';
import { listPendingEffects } from '../src/effect-state.js';

function sink(){let value='';return{stream:new Writable({write(c,_e,cb){value+=String(c);cb();}}),text:()=>value};}
async function scenario({loseResponse}){
 const root=mkdtempSync(join(tmpdir(),'ruleoak-stdio-effect-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});
 writeFileSync(join(root,'.ruleoak','policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'allow-write',effect:'allow',actions:['mcp.write_file'],resources:['*'],priority:100}]},null,2));
 const target=join(root,'written.txt'),server=join(root,'server.mjs');
 writeFileSync(server,`import {writeFileSync} from 'node:fs';let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const m=JSON.parse(s);writeFileSync(${JSON.stringify(target)},String(m.params.arguments.content));${loseResponse?'process.exit(17);':"process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{ok:true}}));"}});`);
 const out=sink(),err=sink();const request=JSON.stringify({jsonrpc:'2.0',id:41,method:'tools/call',params:{name:'write_file',arguments:{path:target,content:'committed'}}});
 const code=await runWrapped([process.execPath,server],root,{inputChunks:[request],stdout:out.stream,stderr:err.stream,effectBoundary:true,effectProfile:'local-filesystem',effectRoots:[root]});
 assert.equal(existsSync(target),true);assert.equal(code,loseResponse?17:0);
 const events=new EvidenceRecorder(join(root,'.ruleoak','evidence.jsonl')).readEvents();const verified=events.find(e=>e.event_type==='ruleoak.effect.mcp.stdio.verified');assert.ok(verified);assert.equal(verified.ledger_payload.effect_verification.state,'confirmed_success');assert.equal(verified.ledger_payload.retry_decision.disposition,'do_not_retry');assert.equal(listPendingEffects(root).length,0);
 const inflight=join(root,'.ruleoak','effects','inflight');assert.equal(existsSync(inflight)&&readdirSync(inflight).some(n=>n.endsWith('.json')),false,'finalized effect must not leave inflight journal');
 if(!loseResponse)assert.match(out.text(),/"ok":true/);
}
await scenario({loseResponse:false});await scenario({loseResponse:true});
// A generic MCP server using a filesystem-like tool name does not earn local
// filesystem certainty without an explicit/recognized route effect profile.
{
 const root=mkdtempSync(join(tmpdir(),'ruleoak-stdio-unprofiled-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});
 writeFileSync(join(root,'.ruleoak','policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'allow-write',effect:'allow',actions:['mcp.write_file'],resources:['*'],priority:100}]},null,2));
 const target=join(root,'virtual-looking.txt'),server=join(root,'server.mjs');writeFileSync(server,`import {writeFileSync} from 'node:fs';let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const m=JSON.parse(s);writeFileSync(${JSON.stringify(target)},String(m.params.arguments.content));process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{ok:true}}));});`);
 const out=sink(),err=sink();const request=JSON.stringify({jsonrpc:'2.0',id:51,method:'tools/call',params:{name:'write_file',arguments:{path:target,content:'committed'}}});
 await runWrapped([process.execPath,server],root,{inputChunks:[request],stdout:out.stream,stderr:err.stream,effectBoundary:true});
 const pending=listPendingEffects(root);assert.equal(pending.length,1);assert.equal(pending[0].effect_verification.state,'unknown');assert.equal(pending[0].retry_decision.disposition,'verify_before_retry');
}
console.log('MCP stdio full effect-boundary tests passed');
