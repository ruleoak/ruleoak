/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applySemanticInference,
  buildRepositoryUnderstanding,
  createNoopSemanticInferenceAdapter,
  explainUnderstandingNode,
  resolveUnderstandingNode,
  traceUnderstanding,
  validateRepositoryUnderstanding
} from '../src/brownfield-understanding.js';

const root = mkdtempSync(join(tmpdir(), 'ruleoak-brownfield-brownfield-understanding-'));
mkdirSync(join(root, 'src'), { recursive: true });
mkdirSync(join(root, 'tests'), { recursive: true });
mkdirSync(join(root, '.ruleoak', 'intent'), { recursive: true });
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'sample-app', version: '1.0.0', type: 'module', exports: { '.': './src/index.js' } }, null, 2));
writeFileSync(join(root, 'src', 'index.js'), "export { switchStation } from './player.js';\n");
writeFileSync(join(root, 'src', 'player.js'), "export function switchStation(id) { return String(id); }\n");
writeFileSync(join(root, 'tests', 'player.test.js'), "import { switchStation } from '../src/player.js';\nif (switchStation('b') !== 'b') throw new Error('bad');\n");
const intent = {
  intent_manifest_version: '0.1', manifest_id: 'manifest.sample.v01',
  product: { id: 'product.sample', name: 'Sample' },
  capabilities: [{ id: 'cap.switch', name: 'Switch station', invariant_ids: ['inv.switch'] }],
  invariants: [{ id: 'inv.switch', statement: 'Selected station becomes active.', capability_ids: ['cap.switch'] }]
};
writeFileSync(join(root, '.ruleoak', 'intent', 'sample.intent.json'), JSON.stringify(intent, null, 2));
writeFileSync(join(root, '.ruleoak', 'intent', 'sample.binding.json'), JSON.stringify({
  binding_version: '0.1', intent_manifest_id: 'manifest.sample.v01', implementation_id: 'impl.sample.js', language: 'JavaScript',
  capability_bindings: [{ capability_id: 'cap.switch', modules: ['src/player.js'] }]
}, null, 2));

const graphA = buildRepositoryUnderstanding(root);
const graphB = buildRepositoryUnderstanding(root);
assert.deepEqual(graphA, graphB, 'understanding graph must be deterministic for unchanged input');
assert.equal(validateRepositoryUnderstanding(graphA).valid, true, validateRepositoryUnderstanding(graphA).errorMessage);
assert.equal(graphA.repository.root, '.');
assert.equal(graphA.repository.intent_manifest, '.ruleoak/intent/sample.intent.json');
assert.equal(graphA.inference.adapter, 'none');
assert.equal(graphA.inference.enabled, false);
assert.ok(graphA.unknowns.some(row => row.code === 'semantic_inference_not_run' && row.status === 'UNKNOWN'));

const fileNode = resolveUnderstandingNode(graphA, 'src/player.js');
assert.equal(fileNode.kind, 'implementation');
assert.equal(fileNode.provenance.class, 'OBSERVED');
assert.equal(fileNode.provenance.confidence, 1);

const capNode = resolveUnderstandingNode(graphA, 'cap.switch');
assert.equal(capNode.kind, 'capability');
assert.equal(capNode.provenance.class, 'DECLARED');
const implementation = graphA.edges.find(row => row.from === capNode.id && row.to === fileNode.id && row.relation === 'implemented_by');
assert.ok(implementation);
assert.equal(implementation.provenance.class, 'DECLARED');
const candidate = graphA.edges.find(row => row.from === capNode.id && row.relation === 'candidate_test');
assert.ok(candidate);
assert.equal(candidate.provenance.class, 'INFERRED');
assert.ok(candidate.provenance.confidence < 1);
assert.match(candidate.attributes.semantics, /candidate only/i);

const explanation = explainUnderstandingNode(graphA, 'cap.switch');
assert.ok(explanation.outgoing.some(row => row.relation === 'implemented_by'));
assert.ok(explanation.outgoing.some(row => row.relation === 'candidate_test'));
const trace = traceUnderstanding(graphA, 'cap.switch', { maxDepth: 2, direction: 'both' });
assert.ok(trace.nodes.some(row => row.attributes?.relative_path === 'src/player.js'));
assert.ok(trace.nodes.some(row => row.attributes?.relative_path === 'tests/player.test.js'));

const bare = mkdtempSync(join(tmpdir(), 'ruleoak-brownfield-brownfield-understanding-bare-'));
writeFileSync(join(bare, 'package.json'), JSON.stringify({ name: 'bare' }));
writeFileSync(join(bare, 'index.js'), 'export const x = 1;\n');
const bareGraph = buildRepositoryUnderstanding(bare);
assert.ok(bareGraph.unknowns.some(row => row.code === 'intent_manifest_missing'));
assert.equal(bareGraph.nodes.some(row => row.kind === 'capability'), false);

const noop = applySemanticInference(graphA, createNoopSemanticInferenceAdapter());
assert.equal(noop.inference.enabled, false);
assert.throws(() => applySemanticInference(graphA, { adapter_version: '0.1', name: 'bad', infer() { return { nodes: [{ id:'x', provenance:{class:'OBSERVED'} }] }; } }), /must use INFERRED provenance/);
assert.throws(() => applySemanticInference(graphA, { adapter_version: '9', name: 'bad', infer() { return {}; } }), /must implement version 0\.1/);

console.log('Brownfield Understanding unit tests passed');
