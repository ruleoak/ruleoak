/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { buildAuthorityGraph, explainAuthorityGraph, queryAuthorityGraph } from '@ruleoak/core';

function uniqueBy(values,key){const out=new Map();for(const value of values||[]){const k=value?.[key];if(k&&!out.has(k))out.set(k,value);}return [...out.values()];}
export function buildWorkspaceAuthorityGraph(state,options={}){
  const events=state?.events||[];
  const decisions=uniqueBy(events.map(e=>e?.decision?.receipt).filter(Boolean),'decision_id');
  const effects=uniqueBy(events.map(e=>e?.effect_receipt).filter(Boolean),'effect_id');
  const approvals=uniqueBy([...(state?.pending||[]),...(state?.approvals||[])],'approval_id');
  return buildAuthorityGraph({grants:state?.authority?.grants||[],envelopes:state?.authority?.envelopes||[],decisions,approvals,leases:state?.authority?.leases||[],effects},{generatedAt:options.generatedAt||null});
}
export function renderAuthorityGraphSummary(graph){
  const counts={};for(const n of graph.nodes)counts[n.kind]=(counts[n.kind]||0)+1;
  return [`Authority graph ${graph.graph_id}`,`Nodes: ${graph.nodes.length} · Edges: ${graph.edges.length} · Unresolved: ${graph.unresolved_references.length}`,`Principals ${counts.principal||0} · Grants ${counts.grant||0} · Envelopes ${counts.envelope||0} · Decisions ${counts.decision||0} · Approvals ${counts.approval||0} · Leases ${counts.lease||0} · Effects ${counts.effect||0}`].join('\n');
}
export function renderAuthorityExplanation(explanation){
  const lines=[explanation.summary,`Complete: ${explanation.complete?'yes':'no'}`,''];
  for(const node of explanation.nodes)lines.push(`${node.node_id}`);
  if(explanation.unresolved_references.length){lines.push('','Unresolved references:');for(const r of explanation.unresolved_references)lines.push(`- ${r.source_node_id} --${r.relation}--> ${r.target_kind}:${r.target_ref_id}`);}
  return lines.join('\n');
}
export { explainAuthorityGraph, queryAuthorityGraph };
