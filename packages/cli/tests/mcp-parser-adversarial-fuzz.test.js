/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { RuleOakInboundGate, extractJsonFragments } from '../src/stream-gate.js';
class Sink { constructor(){this.text=''} write(c){this.text+=String(c);return true} end(){} }
function rng(seed=0x51a7e){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/0x100000000}}
const rand=rng();
for(let i=0;i<1500;i++){
  const n=1+Math.floor(rand()*80); let s=''; const alphabet='{}[]:,"\\ abcXYZ012\n\r\t';
  for(let j=0;j<n;j++) s+=alphabet[Math.floor(rand()*alphabet.length)];
  const parsed=extractJsonFragments(s); assert.equal(Array.isArray(parsed.fragments),true); assert.equal(typeof parsed.remaining,'string');
}
const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'deny-delete',effect:'deny',priority:100,actions:['mcp.filesystem.delete'],resources:['*']},{id:'allow-read',effect:'allow',priority:10,actions:['mcp.filesystem.read'],resources:['*']}]};
for(let caseNo=0;caseNo<250;caseNo++){
  const child=new Sink(), stdout=new Sink(), stderr=new Sink();
  const gate=new RuleOakInboundGate({policy,recorder:{writeEvent(){return {event_id:'evt'}}},childStdin:child,stdout,stderr,fixedTimestamp:'2026-09-05T00:00:00.000Z'});
  const payload=`noise-${caseNo}\n`+JSON.stringify({jsonrpc:'2.0',id:caseNo,method:'tools/call',params:{name:'filesystem.delete',arguments:{path:`/tmp/blocked-${caseNo}`}}})+'\n';
  let pos=0; while(pos<payload.length){const size=1+Math.floor(rand()*Math.min(17,payload.length-pos)); await gate.write(payload.slice(pos,pos+size)); pos+=size;} await gate.end();
  assert.doesNotMatch(child.text,/filesystem\.delete/,`destructive tools/call escaped gate in chunk case ${caseNo}`);
  assert.match(stdout.text,/RuleOak Firewall/);
}
console.log('MCP parser adversarial fuzz/property tests passed: 1500 malformed/noisy inputs + 250 chunkings');
