/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportIntentToOakSpec, validateOakSpec, validateOakSpecCandidateBundle, canonicalOakSpecJson, OAKSPEC_ADAPTERS } from '../src/oakspec.js';
const here=dirname(fileURLToPath(import.meta.url));
const schema=JSON.parse(readFileSync(resolve(here,'../schemas/oakspec-v1.schema.json'),'utf8'));
const candidateSchema=JSON.parse(readFileSync(resolve(here,'../schemas/oakspec-candidate-bundle-v1.schema.json'),'utf8'));
assert.equal(schema.properties.oakspec_version.const,'1.0');
assert.equal(candidateSchema.properties.candidate_bundle_version.const,'1.0');
assert.deepEqual([...OAKSPEC_ADAPTERS],['openapi','tests','ci','git','agents','docs','mcp']);
const intent=JSON.parse(readFileSync(resolve(here,'../../../.ruleoak/intent/ruleoak-community.intent.json'),'utf8'));
const spec=exportIntentToOakSpec(intent);assert.equal(validateOakSpec(spec).valid,true);assert.equal(spec.capabilities.length,18);assert.equal(spec.invariants.length,40);assert.equal(spec.evidence_requirements.length,18);assert.equal(canonicalOakSpecJson(spec),canonicalOakSpecJson(exportIntentToOakSpec(intent)));
const bundle={candidate_bundle_version:'1.0',bundle_id:'oakspec.candidates.tests.fixture',adapter:'tests',source:{path:'fixture',digest_sha256:'0'.repeat(64)},authority_statement:'Imported candidates are not declared Intent and are not verification evidence.',candidates:[{id:'cand.tests.001.fixture',status:'CANDIDATE',candidate_kind:'evidence_relationship',statement:'test candidate',provenance:'OBSERVED',source_locator:'fixture.test.js',authority:{declared_intent:false,verification_evidence:false,promotion_required:true},metadata:{}}]};
assert.equal(validateOakSpecCandidateBundle(bundle).valid,true);const bad=structuredClone(bundle);bad.candidates[0].authority.verification_evidence=true;assert.equal(validateOakSpecCandidateBundle(bad).valid,false);console.log('OakSpec protocol/schema tests passed');
