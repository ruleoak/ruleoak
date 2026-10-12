/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateIntentManifest } from '../packages/protocol/src/intent.js';
import { SEMANTIC_DIFF_PROVENANCE, SEMANTIC_DIFF_VERSIONS } from '../packages/protocol/src/semantic-diff.js';
const contract=JSON.parse(readFileSync(new URL('../qa/semantic-diff-contract.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../.ruleoak/intent/ruleoak-community.intent.json',import.meta.url),'utf8'));
assert.equal(validateIntentManifest(manifest).valid,true);assert.equal(manifest.manifest_id,'manifest.ruleoak-community.v0.50');assert.ok(manifest.capabilities.some(x=>x.id===contract.required_capability));assert.ok(manifest.invariants.some(x=>x.id===contract.required_invariant));assert.deepEqual(SEMANTIC_DIFF_VERSIONS,['0.1']);assert.deepEqual(SEMANTIC_DIFF_PROVENANCE,['DETERMINISTIC','OBSERVED','INFERRED','UNKNOWN']);
const benchmark=JSON.parse(execFileSync(process.execPath,['scripts/benchmark_semantic_diff.mjs'],{encoding:'utf8',maxBuffer:16*1024*1024}));assert.ok(benchmark.cases>=contract.benchmark_cases_min);assert.ok(benchmark.exact_rate>=contract.benchmark_exact_rate_min);assert.ok(benchmark.declared_behavior_change_recall>=contract.declared_behavior_change_recall_min);assert.ok(benchmark.overclaim_rate<=contract.behavior_overclaim_rate_max);
console.log(`SEMANTIC_DIFF_PASS cases=${benchmark.cases} exact=${benchmark.exact}/${benchmark.cases} overclaims=${benchmark.behavior_overclaims} provenance=${SEMANTIC_DIFF_PROVENANCE.join(',')}`);
