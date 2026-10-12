/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {resolve} from 'node:path';import {buildRepositoryUnderstanding} from '../packages/cli/src/brownfield-understanding.js';import {buildIntentChangePlan} from '../packages/cli/src/intent-change.js';
const root=resolve(new URL('..',import.meta.url).pathname),withMemory=buildRepositoryUnderstanding(root),withoutMemory={...withMemory,nodes:withMemory.nodes.filter(n=>n.kind!=='engineering_memory'),edges:withMemory.edges.filter(e=>!e.from.startsWith('memory:')&&!e.to.startsWith('memory:')),engineering_memory:{version:'0.1',bundles:[],records:0}};
const cases=[
 ['prevent blind retry when effect verification is uncertain','memory.reg.effect-blind-retry'],
 ['reject agent assertion self certification as claim proof','memory.reg.evidence-self-certification'],
 ['improve repository import scan for fixture strings','memory.reg.repository-import-false-positive'],
 ['change semantic impact vocabulary while avoiding incidental match','memory.reg.semantic-impact-incidental-match'],
 ['review implementation only semantic diff without behavior changed overclaim','memory.reg.semantic-diff-overclaim'],
 ['harden implementation proposal against stale digest and out of scope mutation','memory.reg.change-stale-scope'],
 ['reduce repository wide context stuffing under token budget','memory.reg.context-stuffing'],
 ['keep excluded files uncertainty instead of proven irrelevant context omission','memory.reg.context-exclusion-proof'],
 ['handle stale evidence and contradictory evidence freshness','memory.reg.evidence-stale-contradiction'],
 ['harden one use execution lease contention and consumption barrier','memory.reg.execution-lease-contention']
];
let matched=0,changed=0;const rows=[];for(const [request,expected] of cases){const a=buildIntentChangePlan(root,request,{graph:withMemory}).plan,b=buildIntentChangePlan(root,request,{graph:withoutMemory}).plan;const hit=a.engineering_memory.historical_regression_ids.includes(expected),evidenceChanged=JSON.stringify(a.impact.required_evidence_types)!==JSON.stringify(b.impact.required_evidence_types),stepsChanged=a.plan_steps.length>b.plan_steps.length;if(hit)matched++;if(evidenceChanged||stepsChanged)changed++;rows.push({request,expected_regression:expected,matched:hit,memory_regressions:a.engineering_memory.historical_regression_ids,memory_required_evidence:a.engineering_memory.required_evidence_types,plan_changed:evidenceChanged||stepsChanged,baseline_required_evidence:b.impact.required_evidence_types,current_required_evidence:a.impact.required_evidence_types});}
const result={benchmark_version:'engineering-memory-1.0',cases:cases.length,expected_regression_match_rate:matched/cases.length,history_changes_plan_or_verification_rate:changed/cases.length,rows};if(cases.length<10||matched!==cases.length||changed!==cases.length){console.error(JSON.stringify(result,null,2));process.exit(1);}console.log(JSON.stringify(result,null,2));export{result};
