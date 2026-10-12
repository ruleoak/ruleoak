/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalIntentJson, normalizeIntentManifest, summarizeIntentManifest, validateIntentManifest } from '../src/intent.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const example = readJson('../../../examples/intent-ir/radio-playback.intent.json');
const kotlin = readJson('../../../examples/intent-ir/implementation-kotlin.binding.json');
const typescript = readJson('../../../examples/intent-ir/implementation-typescript.binding.json');
const schema = readJson('../schemas/intent-manifest-v0.1.schema.json');

assert.equal(schema.properties.intent_manifest_version.const, '0.1');
assert.equal(schema.additionalProperties, false);
assert.equal(validateIntentManifest(example).valid, true, validateIntentManifest(example).errorMessage);
assert.equal(summarizeIntentManifest(example).counts.capabilities, 2);

const duplicate = structuredClone(example);
duplicate.goals[0].id = duplicate.capabilities[0].id;
const duplicateResult = validateIntentManifest(duplicate);
assert.equal(duplicateResult.valid, false);
assert.match(duplicateResult.errorMessage, /duplicate global id/);

const unknown = structuredClone(example);
unknown.capabilities[0].invariant_ids = ['inv.does-not-exist'];
const unknownResult = validateIntentManifest(unknown);
assert.equal(unknownResult.valid, false);
assert.match(unknownResult.errorMessage, /references unknown id/);

const wrongKind = structuredClone(example);
wrongKind.capabilities[0].invariant_ids = ['goal.continuity'];
const wrongKindResult = validateIntentManifest(wrongKind);
assert.equal(wrongKindResult.valid, false);
assert.match(wrongKindResult.errorMessage, /as invariant, but it is goal/);

const unsupported = structuredClone(example);
unsupported.intent_manifest_version = '0.2';
assert.equal(validateIntentManifest(unsupported).valid, false);

const unknownField = structuredClone(example);
unknownField.capabilities[0].source_path = 'src/player.js';
assert.equal(validateIntentManifest(unknownField).valid, false);

const badExtension = structuredClone(example);
badExtension.extensions = { local: true };
assert.equal(validateIntentManifest(badExtension).valid, false);

const reordered = structuredClone(example);
reordered.capabilities.reverse();
reordered.invariants.reverse();
reordered.capabilities[0].invariant_ids?.reverse();
assert.equal(canonicalIntentJson(reordered), canonicalIntentJson(example));
assert.deepEqual(normalizeIntentManifest(reordered).capabilities.map(x => x.id), [...example.capabilities].map(x => x.id).sort());

// Graduation property: one durable Intent IR binds to two structurally different implementations.
assert.equal(kotlin.intent_manifest_id, example.manifest_id);
assert.equal(typescript.intent_manifest_id, example.manifest_id);
assert.notEqual(kotlin.language, typescript.language);
assert.notDeepEqual(kotlin.capability_bindings, typescript.capability_bindings);
for (const binding of [kotlin, typescript]) {
  for (const row of binding.capability_bindings) assert.ok(example.capabilities.some(capability => capability.id === row.capability_id));
}
const serializedIntent = JSON.stringify(example);
assert.equal(serializedIntent.includes('StationCoordinator.kt'), false);
assert.equal(serializedIntent.includes('station-controller.ts'), false);

console.log('Intent IR v0.1 protocol tests passed');
