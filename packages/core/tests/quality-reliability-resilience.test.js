/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync,mkdtempSync,readFileSync,writeFileSync,utimesSync } from 'node:fs';
import { hostname,tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ApprovalBroker,EvidenceRecorder,RevocationRegistry,consumeExecutionGrant,evaluatePermissionRequest,
  fetchOfficialMcpRegistrySnapshot,normalizeAuthorityBudget
} from '../src/index.js';
import { withFileLock } from '../src/io/file-lock.js';

const now=new Date();const nowIso=now.toISOString();
const call={call_id:'qrr-call',timestamp:nowIso,actor:{type:'agent',id:'agent:qrr',name:'qrr-agent',session_id:'qrr-session'},tool:{name:'email.send',category:'email',operation:'send'},target:{resource:'partner@example.com',scope:'external',sensitivity:'internal'},arguments:{to:'partner@example.com',body:'qrr'},context:{purpose:'qrr'}};
const approvalPolicy={policyVersion:2,defaultAction:'needs_approval',rules:[]};
const pending=evaluatePermissionRequest(call,approvalPolicy,{evaluatedAt:nowIso,receiptTtlMs:120_000});
const hung={apiVersion:'1.1',name:'hung',providerId:'qrr.hung',request(){return new Promise(()=>{});}};
const broker=new ApprovalBroker(hung,{timeoutMs:30});
await assert.rejects(()=>broker.request(pending,{requestedAt:nowIso,ttlMs:60_000}),/timed out/,'hung approval providers must have a bounded exit');

const dir=mkdtempSync(join(tmpdir(),'ruleoak-qrr-'));
const target=join(dir,'state.json');const lock=`${target}.lock`;
writeFileSync(lock,JSON.stringify({token:'live-token',pid:process.pid,host:hostname(),acquired_at:new Date(Date.now()-60_000).toISOString()})+'\n');utimesSync(lock,new Date(Date.now()-60_000),new Date(Date.now()-60_000));
assert.throws(()=>withFileLock(target,()=>{}, {timeoutMs:30,retryMs:5,staleMs:1000}),/timed out acquiring file lock/,'an old mtime must not evict a live local lock holder');assert.equal(existsSync(lock),true);
writeFileSync(lock,JSON.stringify({token:'dead-token',pid:2147483647,host:hostname(),acquired_at:new Date(Date.now()-60_000).toISOString()})+'\n');utimesSync(lock,new Date(Date.now()-60_000),new Date(Date.now()-60_000));
assert.equal(withFileLock(target,()=>42,{timeoutMs:100,retryMs:5,staleMs:1000}),42,'a confirmed dead stale holder may be recovered');

assert.throws(()=>normalizeAuthorityBudget({max_executions:Number.MAX_SAFE_INTEGER+1}),/safe/,'integer authority budgets must not cross the safe-integer boundary');
const revocations=new RevocationRegistry({filePath:join(dir,'revocations.jsonl'),limits:{maxRecords:1}});revocations.revoke('session','s1',{now:nowIso});assert.throws(()=>revocations.revoke('session','s2',{now:new Date(now.getTime()+1).toISOString()}),/maxRecords/);

const evidence=new EvidenceRecorder(join(dir,'evidence.jsonl'),{limits:{maxEvents:1,maxBytes:1024*1024,maxLineBytes:128*1024}});evidence.append({type:'qrr.test',target:'x',arguments:{},metadata:{}},{action:'deny',reason:'test'},nowIso);assert.throws(()=>evidence.append({type:'qrr.test',target:'y',arguments:{},metadata:{}},{action:'deny',reason:'test'},new Date(now.getTime()+1).toISOString()),/maxEvents/);

const allowPolicy={policyVersion:2,defaultAction:'allow',rules:[]};const allowedCall={call_id:'qrr-read',timestamp:nowIso,actor:{type:'agent',id:'agent:qrr',name:'qrr-agent',session_id:'qrr-session'},tool:{name:'filesystem.read',category:'file',operation:'read'},target:{resource:'project/a.txt',scope:'local',sensitivity:'internal'},arguments:{path:'project/a.txt'},context:{purpose:'qrr'}};const allowed=evaluatePermissionRequest(allowedCall,allowPolicy,{evaluatedAt:nowIso,receiptSecret:'qrr-secret',receiptTtlMs:120_000});const consumed=consumeExecutionGrant(allowed.decision.receipt,allowedCall,allowPolicy,'qrr-secret',{storeDir:join(dir,'consumed'),now:nowIso,consumedAt:nowIso});assert.equal(consumed.ok,true);writeFileSync(consumed.markerPath,'{corrupt');const replay=consumeExecutionGrant(allowed.decision.receipt,allowedCall,allowPolicy,'qrr-secret',{storeDir:join(dir,'consumed'),now:new Date(now.getTime()+10).toISOString()});assert.equal(replay.replayed,true);assert.match(replay.errors.join(' '),/marker unreadable/,'corrupt replay markers must fail closed without throwing through');

let fetchCalls=0;const retryFetch=async()=>{fetchCalls++;if(fetchCalls===1)return new Response(JSON.stringify({error:'busy'}),{status:503,headers:{'content-type':'application/json'}});return new Response(JSON.stringify({servers:[],metadata:{}}),{status:200,headers:{'content-type':'application/json'}});};const snapshot=await fetchOfficialMcpRegistrySnapshot({fetchImpl:retryFetch,maxAttempts:2,random:()=>0,observedAt:nowIso});assert.equal(snapshot.count,0);assert.equal(fetchCalls,2,'idempotent Registry GET may use bounded retry');
await assert.rejects(()=>fetchOfficialMcpRegistrySnapshot({fetchImpl:async()=>new Response('x'.repeat(65),{status:200,headers:{'content-type':'application/json'}}),maxResponseBytes:64}),/maxResponseBytes/,'Registry JSON must be bounded before materialization');
await assert.rejects(()=>fetchOfficialMcpRegistrySnapshot({fetchImpl:async()=>new Response('{}',{status:200,headers:{'content-type':'text/html'}})}),/Content-Type/);

console.log('Quality/reliability/resilience core tests passed');
