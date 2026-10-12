/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync,mkdirSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleOakFlightRecorder } from '@ruleoak/core';
import { inspectMcpUrl } from '../src/inspector.js';
import { createAuthorizationApiServer, createMcpStreamableHttpGateway } from '../src/http-gateway.js';
import { readFlightState } from '../src/flight-control/store.js';
import { runCrashScenarioFile } from '../src/crashlab.js';

await assert.rejects(()=>inspectMcpUrl('https://user:password@example.test/mcp',{fetchImpl:async()=>{throw new Error('must not fetch')}}),/credentials/);
await assert.rejects(()=>inspectMcpUrl('http://example.test/mcp',{fetchImpl:async()=>{throw new Error('must not fetch')}}),/must use HTTPS/);
await assert.rejects(()=>inspectMcpUrl('http://127.0.0.1/mcp',{allowInsecureLoopback:true,fetchImpl:async()=>new Response('{}',{status:200,headers:{'content-type':'text/html'}})}),/Content-Type/);
await assert.rejects(()=>inspectMcpUrl('http://127.0.0.1/mcp',{allowInsecureLoopback:true,maxResponseBytes:64,fetchImpl:async()=>new Response(JSON.stringify({result:{tools:[{name:'x'.repeat(100)}]}}),{status:200,headers:{'content-type':'application/json'}})}),/maxBytes/);
const sanitized=await inspectMcpUrl('https://example.test/mcp?access_token=runtime-only',{fetchImpl:async()=>new Response(JSON.stringify({result:{tools:[]}}),{status:200,headers:{'content-type':'application/json','MCP-Protocol-Version':'2026-07-28'}})});assert.doesNotMatch(JSON.stringify(sanitized),/runtime-only/,'persisted inspection metadata must not retain query secrets');

const crashDir=mkdtempSync(join(tmpdir(),'ruleoak-qrr-crashlab-'));const oversizedScenario=join(crashDir,'oversized.json');writeFileSync(oversizedScenario,JSON.stringify({scenario_version:'2.1',id:'x',padding:'x'.repeat(512)}));await assert.rejects(()=>runCrashScenarioFile(oversizedScenario,{maxScenarioBytes:128}),/maxBytes/,'CrashLab must bound scenario files before JSON materialization');

const dir=mkdtempSync(join(tmpdir(),'ruleoak-qrr-cli-'));mkdirSync(join(dir,'.ruleoak','authority','grants'),{recursive:true});writeFileSync(join(dir,'.ruleoak','authority','grants','broken.json'),'{broken');const state=readFlightState(dir);assert.ok(state.warnings.some(w=>/authority grant/.test(w)),'corrupt optional Flight state must be visible as a warning');


const hungApi=createAuthorizationApiServer({listen:'127.0.0.1:0',handlerTimeoutMs:75,authorize:async()=>new Promise(()=>{}),approve:async()=>({ok:true}),consume:async()=>({ok:true}),pending:async()=>[],health:async()=>({ok:true})});const ha=await hungApi.start();const hs=Date.now();const hr=await fetch(`http://${ha.host}:${ha.port}/v1/authorize`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(hr.status,504);assert.ok(Date.now()-hs<1500,'hung authorization callback must have a bounded exit');const hj=await hr.json();assert.equal(hj.error.code,'RULEOAK_HANDLER_TIMEOUT');await hungApi.close();

const sockets=new Set();const upstream=createServer((_req,_res)=>{});upstream.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));const address=upstream.address();const gateway=createMcpStreamableHttpGateway({upstream:`http://127.0.0.1:${address.port}`,listen:'127.0.0.1:0',upstreamTimeoutMs:100,policy:{policyVersion:2,defaultAction:'deny',rules:[{id:'allow-read',effect:'allow',actions:['mcp.repo.read'],resources:['*'],allowCritical:true}]},recorder:new RuleOakFlightRecorder(join(dir,'evidence.jsonl')),receiptSecret:'qrr-http-secret',executionSecret:'qrr-http-secret',consumedReceiptsDir:join(dir,'leases')});const g=await gateway.start();const started=Date.now();const response=await fetch(`http://${g.host}:${g.port}`,{method:'POST',headers:{'content-type':'application/json','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':'repo.read'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'repo.read',arguments:{}}})});assert.equal(response.status,500);assert.ok(Date.now()-started<2000,'hung upstream must have a bounded exit');await gateway.close();for(const s of sockets)s.destroy();await new Promise(r=>upstream.close(r));

console.log('Quality/reliability/resilience CLI tests passed');
