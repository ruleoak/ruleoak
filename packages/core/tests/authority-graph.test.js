/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {buildAuthorityGrant,buildAuthorityEnvelope,buildDecisionReceipt,buildExecutionLease,buildEffectReceipt,buildAuthorityGraph,queryAuthorityGraph,explainAuthorityGraph} from '../src/index.js';
import {validateAuthorityGraph} from '@ruleoak/protocol';

const now='2026-08-27T04:00:00.000Z',secret='graph-test-secret';
const grant=buildAuthorityGrant({grant_id:'grant_graph',issuer:'user:owner',subject:{type:'agent',id:'agent-a'},principal_chain:[{type:'user',id:'user:owner'},{type:'agent',id:'agent-a'}],capabilities:[{id:'cap-read',actions:['resource.read'],resources:['ruleoak://file/project/**']}],not_before:now,expires_at:'2026-08-27T06:00:00.000Z'},{secret,issuedAt:now});
const envelope=buildAuthorityEnvelope(grant,{envelope_id:'env_graph',capabilities:[{id:'env-read',actions:['resource.read'],resources:['ruleoak://file/project/**']}],constraints:{max_executions:1,network:'deny',delegation_allowed:false},obligations:[{type:'require_effect_receipt'}],not_before:now,expires_at:'2026-08-27T05:30:00.000Z',policy_digest:'sha256:'+'a'.repeat(64)},{authoritySecret:secret,envelopeSecret:secret,now});
const normalizedCall={call_id:'call-graph',timestamp:now,actor:{type:'agent',id:'agent-a',name:'agent-a',session_id:'sess-a'},tool:{name:'filesystem.read',category:'file',operation:'read'},target:{resource:'project/a.txt',scope:'local',sensitivity:'internal'},arguments:{path:'project/a.txt',secret:'DO_NOT_GRAPH'},context:{}};
const result={normalizedCall,action:{},classification:{risk:'safe'},decision:{action:'allow',source:'policy',matchedRule:'allow-read'},authority:{grant,envelope,canonicalAction:'resource.read',canonicalResource:'ruleoak://file/project/a.txt'}};
const policy={policyVersion:2,defaultAction:'deny',rules:[]};
const receipt=buildDecisionReceipt(result,policy,{decisionId:'dec_graph',evaluatedAt:now});
result.decision.receipt=receipt;
const lease=buildExecutionLease(result,policy,{leaseId:'lease_graph',issuedAt:'2026-08-27T04:01:00.000Z',ttlMs:60000});
const effect=buildEffectReceipt(lease,{status:'success',observation_quality:'complete_for_adapter',requested:{secret:'DO_NOT_GRAPH'},observed:{path:'private/path'}},{effectId:'effect_graph',adapter:'git-safe',startedAt:'2026-08-27T04:01:10.000Z',completedAt:'2026-08-27T04:01:11.000Z',observationBoundary:'git-safe-test'});
const approval={approval_id:'appr_graph',status:'pending',requested_at:now,decision_receipt:{...receipt,decision:'needs_approval'},decision_key:'safe-key',normalized_call:{arguments:{token:'DO_NOT_GRAPH'}}};

const graph=buildAuthorityGraph({grants:[grant],envelopes:[envelope],decisions:[receipt],approvals:[approval],leases:[lease],effects:[effect]},{generatedAt:'2026-08-27T04:02:00Z'});
assert.equal(validateAuthorityGraph(graph).valid,true);
assert.match(graph.graph_id,/^sha256:[a-f0-9]{64}$/);
assert.equal(graph.nodes.some(n=>n.node_id==='principal:agent-a'),true);
assert.equal(graph.nodes.some(n=>n.node_id==='grant:grant_graph'),true);
assert.equal(graph.nodes.some(n=>n.node_id==='effect:effect_graph'),true);
assert.equal(graph.edges.some(e=>e.relation==='bounds_envelope'),true);
assert.equal(graph.edges.some(e=>e.relation==='authorizes_lease'),true);
assert.equal(graph.edges.some(e=>e.relation==='produces_effect'),true);
assert.equal(graph.edges.some(e=>e.relation==='requires_approval'),true);
assert.ok(!JSON.stringify(graph).includes('DO_NOT_GRAPH'),'authority graph must not copy action/effect payload bodies');
assert.ok(!JSON.stringify(graph).includes('private/path'));
const explanation=explainAuthorityGraph(graph,'effect:effect_graph');
for(const id of ['principal:agent-a','grant:grant_graph','envelope:env_graph','decision:dec_graph','lease:lease_graph','effect:effect_graph'])assert.ok(explanation.nodes.some(n=>n.node_id===id),`missing explanation node ${id}`);
assert.equal(explanation.complete,true);
const q=queryAuthorityGraph(graph,{kind:'lease'});assert.equal(q.nodes.length,1);assert.equal(q.nodes[0].ref_id,'lease_graph');
const graph2=buildAuthorityGraph({grants:[grant],envelopes:[envelope],decisions:[receipt],approvals:[approval],leases:[lease],effects:[effect]},{generatedAt:'2026-08-28T04:02:00Z'});assert.equal(graph2.graph_id,graph.graph_id,'generated_at must not change semantic graph identity');
const unresolved=buildAuthorityGraph({leases:[lease]});assert.ok(unresolved.unresolved_references.some(r=>r.target_kind==='decision'&&r.target_ref_id==='dec_graph'));assert.equal(explainAuthorityGraph(unresolved,'lease:lease_graph').complete,false);
assert.throws(()=>buildAuthorityGraph({decisions:[{...receipt,decision_id:''}]}),/invalid authority graph decision/);
console.log('authority graph tests passed');
const ownerNode=graph.nodes.find(n=>n.node_id==='principal:user:owner');assert.equal(ownerNode.data.type,'user');assert.ok(graph.edges.some(e=>e.from==='principal:user:owner'&&e.relation==='principal_chain_member'));
const tampered=structuredClone(graph);tampered.nodes.find(n=>n.kind==='lease').data.max_uses=99;assert.throws(()=>queryAuthorityGraph(tampered,{kind:'lease'}),/digest mismatch/);
const serviceGrant=buildAuthorityGrant({grant_id:'grant_service',issuer:'user:owner',subject:{type:'service',id:'svc-a'},principal_chain:[{type:'service',id:'svc-a'}],capabilities:[{id:'c',actions:['resource.read'],resources:['**']}],not_before:now,expires_at:'2026-08-27T06:00:00.000Z'},{issuedAt:now});
const serviceLease={...lease,lease_id:'lease_service',principal_id:'svc-a',authority_grant_id:'grant_service'};assert.doesNotThrow(()=>buildAuthorityGraph({grants:[serviceGrant],leases:[serviceLease]}),'lease must not invent agent type for an explicitly typed service principal');
assert.throws(()=>buildAuthorityGraph({approvals:[{approval_id:'bad-time',status:'pending',requested_at:'not-a-date'}]}),/requested_at/);
