/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileIntentExperiment, generateEngineeringMemoryMatcherSource, loadIntentRecompilePackage } from '../src/intent-compiler.js';
import { ENGINEERING_MEMORY_MATCHER } from '../src/engineering-memory.js';
const root=resolve(new URL('../../..',import.meta.url).pathname),pkg=loadIntentRecompilePackage(resolve(root,'qa/recompile/engineering-memory-relevance.intent-package.json'));
const expected=generateEngineeringMemoryMatcherSource(pkg),checked=readFileSync(resolve(root,pkg.target_module),'utf8');assert.equal(checked,expected);assert(ENGINEERING_MEMORY_MATCHER.includes('intent-recompiled:weighted-trigger-gate-v1'));
const {report}=await compileIntentExperiment(root);assert.equal(report.status,'DRY_RUN_READY');assert.equal(report.replacement.checked_in_matches_generated,true);assert.equal(report.replacement.materially_different,true);assert(report.replacement.distinct_structure_signal_count>=pkg.synthesis.minimum_distinct_structure_signals);assert.equal(report.baseline.isolated_from_runtime,true);assert.equal(report.model_execution.implementer.authority,'NON_AUTHORITATIVE');assert.equal(report.model_execution.reviewer.authority,'NON_AUTHORITATIVE');assert.notEqual(report.model_execution.implementer.strategy,report.model_execution.reviewer.strategy);assert.equal(report.equivalence.status,'NOT_RUN');
console.log('Intent Compiler tests passed');
