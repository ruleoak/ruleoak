/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { buildEvidenceGraph, queryEvidenceTimeline, traceEvidenceGraph } from '@ruleoak/core';
import { buildWorkspaceAuthorityGraph } from './authority-graph.js';

export function buildWorkspaceEvidenceGraph(state,options={}){
  const authorityGraph=options.authorityGraph||buildWorkspaceAuthorityGraph(state,{generatedAt:options.generatedAt||null});
  return buildEvidenceGraph({authorityGraph,events:state?.events||[]},{generatedAt:options.generatedAt||null});
}
export function renderEvidenceGraphSummary(graph){
  const counts={};for(const n of graph.nodes)counts[n.kind]=(counts[n.kind]||0)+1;
  return [
    `Evidence graph ${graph.graph_id}`,
    `Authority graph: ${graph.source.authority_graph_id}`,
    `Recorder events: ${graph.source.evidence_event_count} · Nodes: ${graph.nodes.length} · Edges: ${graph.edges.length} · Unresolved: ${graph.unresolved_references.length}`,
    `Decisions ${counts.decision||0} · Approvals ${counts.approval||0} · Leases ${counts.lease||0} · Adapters ${counts.adapter||0} · Effects ${counts.effect||0} · Recorder events ${counts.recorder_event||0}`
  ].join('\n');
}
export function renderEvidenceTrace(trace){
  const lines=[trace.summary,`Complete: ${trace.complete?'yes':'no'}`,''];
  for(const node of trace.nodes)lines.push(`${node.node_id}${node.occurred_at?` @ ${node.occurred_at}`:''}`);
  if(trace.unresolved_references.length){lines.push('','Unresolved evidence:');for(const r of trace.unresolved_references)lines.push(`- ${r.source_node_id} --${r.relation}--> ${r.target_kind}:${r.target_ref_id}`);}
  return lines.join('\n');
}
export { queryEvidenceTimeline, traceEvidenceGraph };
