/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRepositoryUnderstanding, validateRepositoryUnderstanding } from '../packages/cli/src/brownfield-understanding.js';

const contract = JSON.parse(readFileSync(new URL('../qa/brownfield-understanding-contract.json', import.meta.url), 'utf8'));
const a = buildRepositoryUnderstanding(process.cwd());
const b = buildRepositoryUnderstanding(process.cwd());
assert.deepEqual(a, b, 'Brownfield Understanding repository understanding must be deterministic for unchanged source');
const validation = validateRepositoryUnderstanding(a);
assert.equal(validation.valid, true, validation.errorMessage);
assert.equal(a.understanding_version, contract.understanding_version);
assert.equal(a.inference.adapter, contract.semantic_inference_default);
assert.equal(a.inference.enabled, false);
assert.ok(a.unknowns.some(row => row.status === contract.unknown_status && row.code === 'semantic_inference_not_run'));
for (const provenanceClass of contract.required_provenance_classes) assert.ok(a.summary.provenance_records[provenanceClass] > 0, `missing ${provenanceClass} provenance records`);
for (const capability of contract.required_capabilities) {
  const nodeId = `intent:${capability}`;
  const impl = a.edges.filter(row => row.from === nodeId && row.relation === 'implemented_by');
  const tests = a.edges.filter(row => row.from === nodeId && row.relation === 'candidate_test');
  assert.ok(impl.length >= contract.minimum_explicit_implementation_bindings_per_capability, `${capability}: insufficient explicit implementation bindings`);
  assert.ok(impl.every(row => row.provenance.class === 'DECLARED' && row.provenance.confidence === 1));
  assert.ok(tests.length >= contract.minimum_candidate_tests_per_capability, `${capability}: insufficient candidate tests`);
  assert.ok(tests.every(row => row.provenance.class === 'INFERRED' && row.provenance.confidence < 1));
}
assert.ok(a.edges.some(row => row.relation === 'imports' && row.provenance.class === 'OBSERVED'));
assert.ok(a.nodes.some(row => row.kind === 'interface' && row.provenance.class === 'OBSERVED'));
console.log(`BROWNFIELD_UNDERSTANDING_PASS ${a.summary.nodes} nodes ${a.summary.edges} edges ${a.summary.unknowns} unknown`);
