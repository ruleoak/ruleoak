/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {buildWorkspaceAuthorityGraph,renderAuthorityGraphSummary,renderAuthorityExplanation,explainAuthorityGraph,queryAuthorityGraph} from '../src/authority-graph.js';
const grant={grant_version:'1.0',grant_id:'g1',issuer:'user:owner',subject:{type:'agent',id:'agent-a'},principal_chain:[{type:'agent',id:'agent-a'}],capabilities:[{id:'c1',actions:['resource.read'],resources:['**']}],issued_at:'2026-08-27T01:00:00Z',not_before:'2026-08-27T01:00:00Z',expires_at:'2026-08-27T02:00:00Z',parent_grant_id:null,delegation_depth:0};
const state={pending:[],approvals:[],events:[],authority:{grants:[grant],envelopes:[],leases:[],revocations:[]}};
const graph=buildWorkspaceAuthorityGraph(state,{generatedAt:'2026-08-27T01:01:00Z'});
assert.equal(graph.nodes.some(n=>n.node_id==='grant:g1'),true);
assert.match(renderAuthorityGraphSummary(graph),/Grants 1/);
const q=queryAuthorityGraph(graph,{kind:'grant'});assert.equal(q.nodes.length,1);
const explanation=explainAuthorityGraph(graph,'grant:g1');assert.match(renderAuthorityExplanation(explanation),/Authority explanation/);
assert.ok(!JSON.stringify(graph).includes('capabilities'),'graph projection should expose only capability_count, not capability bodies');
console.log('authority graph CLI tests passed');
