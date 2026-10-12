/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  buildAuthorityGrant,buildAuthorityEnvelope,buildDecisionReceipt,buildExecutionLease,buildEffectReceipt,
  buildAuthorityGraph,buildEvidenceGraph,queryEvidenceTimeline,traceEvidenceGraph,
  EvidenceRecorder,RuleOakAuthorityLedger
} from '../src/index.js';
import {validateEvidenceGraph} from '@ruleoak/protocol';

const now='2026-08-27T06:00:00.000Z',secret='evidence-graph-secret';
const grant=buildAuthorityGrant({grant_id:'grant_ev',issuer:'user:owner',subject:{type:'agent',id:'agent-e'},principal_chain:[{type:'user',id:'user:owner'},{type:'agent',id:'agent-e'}],capabilities:[{id:'cap',actions:['resource.read'],resources:['ruleoak://file/project/**']}],not_before:now,expires_at:'2026-08-27T08:00:00.000Z'},{secret,issuedAt:now});
const envelope=buildAuthorityEnvelope(grant,{envelope_id:'env_ev',capabilities:[{id:'cap2',actions:['resource.read'],resources:['ruleoak://file/project/**']}],constraints:{max_executions:1},obligations:[{type:'require_effect_receipt'}],not_before:now,expires_at:'2026-08-27T07:30:00.000Z',policy_digest:'sha256:'+'a'.repeat(64)},{authoritySecret:secret,envelopeSecret:secret,now});
const normalizedCall={call_id:'call-ev',timestamp:now,actor:{type:'agent',id:'agent-e',name:'agent-e',session_id:'sess-e'},tool:{name:'filesystem.read',category:'file',operation:'read'},target:{resource:'project/a.txt',scope:'local',sensitivity:'internal'},arguments:{path:'project/a.txt',secret:'DO_NOT_EVIDENCE_GRAPH'},context:{}};
const result={normalizedCall,action:{},classification:{risk:'safe'},decision:{action:'allow',source:'policy',matchedRule:'allow-read'},authority:{grant,envelope,canonicalAction:'resource.read',canonicalResource:'ruleoak://file/project/a.txt'}};
const policy={policyVersion:2,defaultAction:'deny',rules:[]};
const receipt=buildDecisionReceipt(result,policy,{decisionId:'dec_ev',evaluatedAt:now});
result.decision.receipt=receipt;
const lease=buildExecutionLease(result,policy,{leaseId:'lease_ev',issuedAt:'2026-08-27T06:01:00.000Z',ttlMs:60000});
const effect=buildEffectReceipt(lease,{status:'unknown',observation_quality:'ambiguous',requested:{secret:'DO_NOT_EVIDENCE_GRAPH'},observed:{private:'DO_NOT_EVIDENCE_GRAPH'}},{effectId:'effect_ev',adapter:'remote-http',startedAt:'2026-08-27T06:01:10.000Z',completedAt:'2026-08-27T06:01:11.000Z'});

const authorityGraph=buildAuthorityGraph({grants:[grant],envelopes:[envelope],decisions:[receipt],leases:[lease],effects:[effect]});
const dir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-graph-'));
const recorder=new EvidenceRecorder(join(dir,'evidence.jsonl'));
recorder.append({type:'filesystem.read',target:'project/a.txt',arguments:{secret:'DO_NOT_EVIDENCE_GRAPH'},metadata:{}},{action:'allow',receipt},now);
recorder.append({type:'ruleoak.effect',target:'ruleoak://effect',arguments:{},metadata:{}},{action:'allow'},'2026-08-27T06:01:11.000Z',{effectReceipt:effect});
const before=readFileSync(join(dir,'evidence.jsonl'),'utf8');
const events=recorder.readEvents();
const graph=buildEvidenceGraph({authorityGraph,events},{generatedAt:'2026-08-27T06:02:00Z'});
assert.equal(validateEvidenceGraph(graph).valid,true);
assert.equal(graph.source.authority_graph_id,authorityGraph.graph_id);
assert.equal(graph.source.evidence_event_count,2);
assert.equal(graph.nodes.some(n=>n.node_id==='adapter:remote-http'),true);
assert.equal(graph.edges.some(e=>e.from==='lease:lease_ev'&&e.relation==='executes_through'&&e.to==='adapter:remote-http'),true);
assert.equal(graph.edges.some(e=>e.from==='adapter:remote-http'&&e.relation==='observes_effect'&&e.to==='effect:effect_ev'),true);
assert.equal(graph.nodes.find(n=>n.node_id==='effect:effect_ev').data.status,'unknown','ambiguous remote effect status must be preserved');
assert.equal(graph.nodes.find(n=>n.node_id==='effect:effect_ev').data.observation_quality,'ambiguous');
assert.equal(graph.nodes.find(n=>n.node_id==='effect:effect_ev').data.observation_boundary,'ambiguous-effect');
assert.ok(!JSON.stringify(graph).includes('DO_NOT_EVIDENCE_GRAPH'),'evidence graph must not copy effect/action bodies');
const trace=traceEvidenceGraph(graph,'effect:effect_ev');
for(const expected of ['grant:grant_ev','envelope:env_ev','decision:dec_ev','lease:lease_ev','adapter:remote-http','effect:effect_ev'])assert.ok(trace.nodes.some(n=>n.node_id===expected),`trace missing ${expected}`);
const timeline=queryEvidenceTimeline(graph,{from:'2026-08-27T06:00:00Z',to:'2026-08-27T06:02:00Z'});
assert.ok(timeline.items.length>=4);
assert.equal(readFileSync(join(dir,'evidence.jsonl'),'utf8'),before,'derived Evidence Graph must not mutate recorder bytes');

const missingApprovalReceipt={...receipt,receipt_version:'1.2',decision_id:'dec_appr',approval_id:'missing-appr',approval_result_id:'missing-result',approval_request_decision_id:'dec_pending',approval_provider_id:'provider:x'};
const missingApprovalGraph=buildAuthorityGraph({grants:[grant],decisions:[missingApprovalReceipt]});
const missingApprovalEvidence=buildEvidenceGraph({authorityGraph:missingApprovalGraph,events:[]});
assert.ok(missingApprovalEvidence.unresolved_references.some(r=>r.target_kind==='approval'&&r.target_ref_id==='missing-appr'));

const missingDir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-missing-'));
const missingRecorder=new EvidenceRecorder(join(missingDir,'evidence.jsonl'));
const ledger=new RuleOakAuthorityLedger(missingRecorder);
ledger.leaseConsumed(lease,{consumed_at:'2026-08-27T06:01:05.000Z'});
const missingEffectAuthority=buildAuthorityGraph({grants:[grant],envelopes:[envelope],decisions:[receipt],leases:[lease]});
const missingEffectGraph=buildEvidenceGraph({authorityGraph:missingEffectAuthority,events:missingRecorder.readEvents()});
assert.ok(missingEffectGraph.unresolved_references.some(r=>r.source_node_id==='lease:lease_ev'&&r.relation==='consumed_without_effect_receipt'));

const tampered=recorder.readEvents();tampered[0]={...tampered[0],hash:'0'.repeat(64)};
assert.throws(()=>buildEvidenceGraph({authorityGraph,events:tampered}),/evidence chain verification failed/);
const graphTampered=structuredClone(graph);graphTampered.nodes.find(n=>n.kind==='adapter').data.adapter_id='tampered';assert.throws(()=>queryEvidenceTimeline(graphTampered,{}),/evidence graph digest mismatch/);

const graph2=buildEvidenceGraph({authorityGraph,events},{generatedAt:'2026-08-28T06:02:00Z'});
assert.equal(graph2.graph_id,graph.graph_id,'generated_at must not change Evidence Graph semantic identity');

console.log('Evidence Graph tests passed');
