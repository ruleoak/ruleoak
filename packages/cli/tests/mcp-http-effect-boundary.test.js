/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvidenceRecorder } from '@ruleoak/core';
import { createMcpStreamableHttpGateway } from '../src/http-gateway.js';
import { listPendingEffects } from '../src/effect-state.js';
const root=mkdtempSync(join(tmpdir(),'ruleoak-http-effect-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});const target=join(root,'effect.txt');
const upstream=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;const msg=JSON.parse(body);writeFileSync(target,String(msg.params?.arguments?.content||''));res.destroy();});await new Promise((r,j)=>{upstream.once('error',j);upstream.listen(0,'127.0.0.1',r)});const up=upstream.address();
const recorder=new EvidenceRecorder(join(root,'.ruleoak','evidence.jsonl'));const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['mcp.filesystem.write'],resources:['*'],priority:100}]};const gateway=createMcpStreamableHttpGateway({baseDir:root,upstream:`http://127.0.0.1:${up.port}`,allowInsecureUpstreamLoopback:true,listen:'127.0.0.1:0',policy,recorder,consumedReceiptsDir:join(root,'.ruleoak','consumed-leases'),effectProfile:{kind:'local-filesystem',roots:[root],profile_id:'test-local-filesystem',provenance:'explicit-reviewed-route'}});const addr=await gateway.start();const response=await fetch(`http://${addr.host}:${addr.port}`,{method:'POST',headers:{'content-type':'application/json','MCP-Protocol-Version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'filesystem.write',arguments:{path:target,content:'committed'}}})});assert.equal(response.status,500);const events=recorder.readEvents();const verified=events.find(e=>e.event_type==='ruleoak.effect.mcp.verified');assert.ok(verified);assert.equal(verified.ledger_payload.effect_verification.state,'confirmed_success');assert.equal(verified.ledger_payload.retry_decision.disposition,'do_not_retry');assert.equal(listPendingEffects(root).length,0);await gateway.close();await new Promise(r=>upstream.close(r));console.log('MCP HTTP effect boundary tests passed');
