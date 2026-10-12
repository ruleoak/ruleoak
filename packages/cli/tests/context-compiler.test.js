/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { compileContextPackage } from '../src/context-compiler.js';
import { buildRepositoryUnderstanding } from '../src/brownfield-understanding.js';
const root=resolve(new URL('../../..',import.meta.url).pathname),graph=buildRepositoryUnderstanding(root);const task='improve intent change proposal scope planning while preserving evidence authority';
const a=compileContextPackage(root,task,{graph,maxContextBytes:96*1024,maxFiles:18}),b=compileContextPackage(root,task,{graph,maxContextBytes:96*1024,maxFiles:18});
assert.equal(a.package_id,b.package_id);assert.equal(a.sufficiency.required_bound_module_coverage,1);assert.equal(a.sufficiency.required_intent_coverage,1);assert.equal(a.sufficiency.deterministic_proxy.status,'PASS');assert.equal(a.sufficiency.external_model_comparison.status,'NOT_RUN');assert(a.accounting.included_bytes<=96*1024);assert(a.accounting.included_files<=18);assert(a.accounting.reduction_ratio>0.5);assert(a.intent.invariants.length>0);assert(a.intent.evidence_requirements.length>0);assert(a.uncertainties.some(x=>x.code==='CONTEXT_EXCLUSION_NOT_PROOF'));assert(a.source_slices.some(x=>x.path.includes('intent-change.js')));console.log('Context Compiler tests passed');
