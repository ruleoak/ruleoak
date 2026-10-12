/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { buildRepositoryUnderstanding } from '../src/brownfield-understanding.js';
import { analyzeSemanticImpact } from '../src/semantic-impact.js';
import { compileContextPackage } from '../src/context-compiler.js';
import { buildIntentChangePlan } from '../src/intent-change.js';
import { engineeringMemoryValidity,selectEngineeringMemoryFromGraph,validateEngineeringMemoryFile } from '../src/engineering-memory.js';
const root=resolve(new URL('../../..',import.meta.url).pathname);
const file=resolve(root,'.ruleoak/memory/ruleoak-community.memory.json');const validation=validateEngineeringMemoryFile(file);assert.equal(validation.valid,true);assert(validation.bundle.records.length>=18);
const graph=buildRepositoryUnderstanding(root);assert((graph.engineering_memory?.records||0)>=18);assert(graph.nodes.some(n=>n.id==='memory:memory.reg.effect-blind-retry'));assert(graph.edges.some(e=>e.relation==='historically_protects'));
const request='prevent blind retry when effect verification is uncertain';const impact=analyzeSemanticImpact(graph,request);assert(impact.engineering_memory.regressions.some(r=>r.record_id==='memory.reg.effect-blind-retry'));assert(impact.evidence.required_types.includes('property'));
const memory=selectEngineeringMemoryFromGraph(graph,request,impact.affected_capability_ids);assert(memory.plan_actions.some(x=>x.includes('verify-before-retry')));
const context=compileContextPackage(root,request,{graph,maxContextBytes:96*1024,maxFiles:18});assert(context.engineering_memory.regressions.some(r=>r.record_id==='memory.reg.effect-blind-retry'));
const change=buildIntentChangePlan(root,request,{graph}).plan;assert(change.engineering_memory.historical_regression_ids.includes('memory.reg.effect-blind-retry'));assert(change.engineering_memory.required_evidence_types.includes('property'));assert(change.plan_steps.some(x=>x.action.includes('historical regression protection')));
assert.equal(engineeringMemoryValidity({status:'historical',effective_until:'2026-01-01T00:00:00Z'},'2026-09-07T00:00:00Z').status,'EXPIRED');assert.equal(engineeringMemoryValidity({status:'superseded'},'2026-09-07T00:00:00Z').status,'SUPERSEDED');
console.log('Engineering Memory tests passed');
