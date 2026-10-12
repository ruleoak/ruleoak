/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { validateAuthorityGraph, validateEvidenceGraph } from '@ruleoak/protocol';
import { canonicalDigest, canonicalStringify } from '../decision/receipt.js';
import { verifyAuthorityGraphDigest } from '../authority/graph.js';
import { verifyEvidence, GENESIS_HASH } from '../protocol/recorder.js';

const KINDS=new Set(['principal','grant','envelope','decision','approval','lease','adapter','effect','recorder_event']);
function clone(v){return JSON.parse(JSON.stringify(v));}
function cleanString(v,max=256){if(v===null||v===undefined)return null;const s=String(v).normalize('NFKC').trim();return s?s.slice(0,max):null;}
function cleanTime(v){if(v===null||v===undefined)return null;const t=Date.parse(String(v));return Number.isFinite(t)?new Date(t).toISOString():null;}
function id(kind,ref){return `${kind}:${String(ref)}`;}
function edge(from,relation,to){return{edge_id:canonicalDigest({from,relation,to}),from,to,relation};}
function occurredAt(kind,data={}){
  for(const key of kind==='effect'?['completed_at','started_at']:kind==='approval'?['decided_at','requested_at']:kind==='decision'?['evaluated_at']:['issued_at','timestamp','not_before']){
    const value=cleanTime(data?.[key]);if(value)return value;
  }
  return null;
}
function safeEventData(event){
  return{
    index:event.index,
    schema_version:cleanString(event.schema_version,32),
    event_type:cleanString(event.event_type,128),
    hash:cleanString(event.hash,128),
    previous_hash:cleanString(event.previousHash,128),
    decision_id:cleanString(event.decision_id||event.decision?.receipt?.decision_id),
    action_digest:cleanString(event.action_digest||event.decision?.receipt?.action_digest),
    policy_digest:cleanString(event.policy_digest||event.decision?.receipt?.policy_digest),
    effect_id:cleanString(event.effect_receipt?.effect_id),
    action_type:cleanString(event.action?.type,128)
  };
}
function eventRef(event){return cleanString(event.event_id)||`index-${event.index}`;}
function addNode(map,node){
  const prior=map.get(node.node_id);
  if(!prior){map.set(node.node_id,node);return;}
  if(canonicalStringify(prior)!==canonicalStringify(node))throw new Error(`conflicting evidence graph node: ${node.node_id}`);
}
function addUnresolved(list,source,relation,targetKind,targetRef){
  const ref=cleanString(targetRef);if(!ref)return;
  list.push({source_node_id:source,relation,target_kind:targetKind,target_ref_id:ref});
}
function sortGraph(graph){
  graph.nodes.sort((a,b)=>a.node_id.localeCompare(b.node_id));
  graph.edges.sort((a,b)=>a.edge_id.localeCompare(b.edge_id));
  graph.unresolved_references.sort((a,b)=>canonicalStringify(a).localeCompare(canonicalStringify(b)));
  return graph;
}
export function evidenceGraphDigestPayload(graph){
  return{evidence_graph_version:graph.evidence_graph_version,source:graph.source,nodes:graph.nodes,edges:graph.edges,unresolved_references:graph.unresolved_references};
}
export function verifyEvidenceGraphDigest(graph){return typeof graph?.graph_id==='string'&&graph.graph_id===canonicalDigest(evidenceGraphDigestPayload(graph));}

export function buildEvidenceGraph(input={},options={}){
  const authorityGraph=input.authorityGraph;
  const av=validateAuthorityGraph(authorityGraph);
  if(!av.valid)throw new Error(`invalid authority graph for evidence graph: ${av.errors.join('; ')}`);
  if(!verifyAuthorityGraphDigest(authorityGraph))throw new Error('authority graph digest mismatch');
  const events=Array.isArray(input.events)?input.events:[];
  const verification=verifyEvidence(events);
  if(!verification.ok)throw new Error(`evidence chain verification failed: ${verification.errors.join('; ')}`);
  const nodes=new Map(),edges=[...authorityGraph.edges.map(clone)],unresolved=[...authorityGraph.unresolved_references.map(clone)];
  for(const n of authorityGraph.nodes)addNode(nodes,{...clone(n),occurred_at:occurredAt(n.kind,n.data)});
  const has=(kind,ref)=>nodes.has(id(kind,ref));
  const link=(from,relation,targetKind,targetRef)=>{
    if(!targetRef)return;
    const to=id(targetKind,targetRef);
    if(nodes.has(from)&&nodes.has(to))edges.push(edge(from,relation,to));
    else if(nodes.has(from)&&!nodes.has(to))addUnresolved(unresolved,from,relation,targetKind,targetRef);
  };
  for(const event of events){
    const ref=eventRef(event),nodeId=id('recorder_event',ref);
    addNode(nodes,{node_id:nodeId,kind:'recorder_event',ref_id:ref,occurred_at:cleanTime(event.timestamp),data:safeEventData(event)});
    const decisionId=event.decision_id||event.decision?.receipt?.decision_id;
    if(decisionId)link(nodeId,'records_decision','decision',decisionId);
    const approvalId=event.decision?.approval_id||event.decision?.approvalId||event.decision?.receipt?.approval_id;
    if(approvalId)link(nodeId,'records_approval','approval',approvalId);
    const effect=event.effect_receipt;
    if(effect?.effect_id)link(nodeId,'records_effect','effect',effect.effect_id);
    const payload=event.ledger_payload||{};
    for(const [key,kind,relation] of [
      ['grant_id','grant','records_grant'],['envelope_id','envelope','records_envelope'],
      ['lease_id','lease','records_lease'],['effect_id','effect','records_effect'],
      ['decision_id','decision','records_decision'],['approval_id','approval','records_approval']
    ]) if(typeof payload?.[key]==='string')link(nodeId,relation,kind,payload[key]);
  }
  for(const effectNode of [...nodes.values()].filter(n=>n.kind==='effect')){
    const adapterId=cleanString(effectNode.data?.adapter,256)||'unknown-adapter';
    const adapterNodeId=id('adapter',adapterId);
    addNode(nodes,{node_id:adapterNodeId,kind:'adapter',ref_id:adapterId,occurred_at:null,data:{adapter_id:adapterId}});
    const leaseId=cleanString(effectNode.data?.lease_id);
    if(leaseId&&has('lease',leaseId))edges.push(edge(id('lease',leaseId),'executes_through',adapterNodeId));
    edges.push(edge(adapterNodeId,'observes_effect',effectNode.node_id));
  }
  const effectsByLease=new Set([...nodes.values()].filter(n=>n.kind==='effect').map(n=>cleanString(n.data?.lease_id)).filter(Boolean));
  for(const event of events){
    if(event.event_type!=='lease.consumed')continue;
    const leaseId=cleanString(event.ledger_payload?.lease_id);
    if(leaseId&&has('lease',leaseId)&&!effectsByLease.has(leaseId))addUnresolved(unresolved,id('lease',leaseId),'consumed_without_effect_receipt','effect',`lease-${leaseId}`);
  }
  const graph=sortGraph({
    evidence_graph_version:'1.0',graph_id:'',
    generated_at:options.generatedAt?cleanTime(options.generatedAt):null,
    source:{
      authority_graph_id:authorityGraph.graph_id,
      evidence_event_count:events.length,
      evidence_chain_final_hash:events.at(-1)?.hash||GENESIS_HASH,
      evidence_verified:true
    },
    nodes:[...nodes.values()],
    edges:[...new Map(edges.map(e=>[e.edge_id,e])).values()],
    unresolved_references:[...new Map(unresolved.map(r=>[canonicalStringify(r),r])).values()]
  });
  if(options.generatedAt&&!graph.generated_at)throw new Error('evidence graph generatedAt must be a valid date-time');
  graph.graph_id=canonicalDigest(evidenceGraphDigestPayload(graph));
  const v=validateEvidenceGraph(graph);if(!v.valid)throw new Error(`invalid evidence graph: ${v.errors.join('; ')}`);
  return graph;
}

function assertGraph(graph){
  const v=validateEvidenceGraph(graph);if(!v.valid)throw new Error(`invalid evidence graph: ${v.errors.join('; ')}`);
  if(!verifyEvidenceGraphDigest(graph))throw new Error('evidence graph digest mismatch');
}
export function queryEvidenceTimeline(graph,query={}){
  assertGraph(graph);
  let nodes=[...graph.nodes];
  if(query.kind){if(!KINDS.has(query.kind))throw new Error('evidence timeline kind is invalid');nodes=nodes.filter(n=>n.kind===query.kind);}
  if(query.refId)nodes=nodes.filter(n=>n.ref_id===query.refId);
  const from=query.from?Date.parse(query.from):null,to=query.to?Date.parse(query.to):null;
  if(query.from&&!Number.isFinite(from))throw new Error('evidence timeline from must be a valid date-time');
  if(query.to&&!Number.isFinite(to))throw new Error('evidence timeline to must be a valid date-time');
  nodes=nodes.filter(n=>n.occurred_at).filter(n=>{
    const t=Date.parse(n.occurred_at);return (from===null||t>=from)&&(to===null||t<=to);
  }).sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at)||a.node_id.localeCompare(b.node_id));
  const limit=Number.isInteger(query.limit)?Math.max(1,Math.min(query.limit,5000)):5000;
  return{graph_id:graph.graph_id,items:nodes.slice(0,limit),truncated:nodes.length>limit};
}
export function traceEvidenceGraph(graph,targetNodeId,options={}){
  assertGraph(graph);
  const target=graph.nodes.find(n=>n.node_id===targetNodeId);if(!target)throw new Error(`evidence graph node not found: ${targetNodeId}`);
  const maxDepth=Number.isInteger(options.maxDepth)?Math.max(0,Math.min(options.maxDepth,32)):16;
  const keep=new Set([target.node_id]);let frontier=new Set([target.node_id]);
  for(let depth=0;depth<maxDepth&&frontier.size;depth++){
    const next=new Set();
    for(const e of graph.edges)if(frontier.has(e.to)&&!keep.has(e.from)){keep.add(e.from);next.add(e.from);}
    frontier=next;
  }
  const nodes=graph.nodes.filter(n=>keep.has(n.node_id));
  const edges=graph.edges.filter(e=>keep.has(e.from)&&keep.has(e.to));
  const unresolved=graph.unresolved_references.filter(r=>keep.has(r.source_node_id));
  return{
    graph_id:graph.graph_id,target:clone(target),nodes,edges,
    unresolved_references:unresolved,complete:unresolved.length===0,
    summary:`Evidence trace for ${target.kind} ${target.ref_id}: ${nodes.length} node(s), ${edges.length} relationship(s), ${unresolved.length} unresolved reference(s).`
  };
}
