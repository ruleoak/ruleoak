/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateIntentManifest } from '../packages/protocol/src/intent.js';
import { INTENT_CHANGE_ROLES,INTENT_CHANGE_VERSIONS,IMPLEMENTATION_PROPOSAL_VERSIONS } from '../packages/protocol/src/intent-change.js';
const contract=JSON.parse(readFileSync(new URL('../qa/intent-driven-change-contract.json',import.meta.url),'utf8'));const manifest=JSON.parse(readFileSync(new URL('../.ruleoak/intent/ruleoak-community.intent.json',import.meta.url),'utf8'));
assert.equal(validateIntentManifest(manifest).valid,true);assert.equal(manifest.manifest_id,'manifest.ruleoak-community.v0.50');assert.ok(manifest.capabilities.some(x=>x.id===contract.required_capability));for(const id of contract.required_invariants)assert.ok(manifest.invariants.some(x=>x.id===id),id);assert.deepEqual(INTENT_CHANGE_VERSIONS,['0.1']);assert.deepEqual(IMPLEMENTATION_PROPOSAL_VERSIONS,['0.1']);assert.deepEqual(INTENT_CHANGE_ROLES,['planner','implementer','reviewer','evidence_adjudicator']);
const benchmark=JSON.parse(execFileSync(process.execPath,['scripts/benchmark_intent_change.mjs'],{encoding:'utf8',maxBuffer:32*1024*1024}));assert.ok(benchmark.approved_cases>=contract.benchmark_cases_min);assert.ok(benchmark.ready_rate>=contract.ready_rate_min);assert.ok(benchmark.expected_capability_recall>=contract.expected_capability_recall_min);assert.ok(benchmark.file_target_independence_rate>=contract.file_target_independence_rate_min);
console.log(`INTENT_CHANGE_PASS cases=${benchmark.approved_cases} ready=${benchmark.ready_cases} expected_recall=${benchmark.expected_capability_recalled} file_target_independent=${benchmark.file_target_independent_cases} roles=${INTENT_CHANGE_ROLES.join(',')}`);
