/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalIntentEvidenceJson, INTENT_EVIDENCE_CLASSES, INTENT_EVIDENCE_STATUSES, validateIntentEvidenceBundle } from '../src/intent-evidence.js';
const schema=JSON.parse(readFileSync(new URL('../schemas/intent-evidence-bundle-v0.1.schema.json',import.meta.url),'utf8'));
const verificationSchema=JSON.parse(readFileSync(new URL('../schemas/intent-verification-v0.1.schema.json',import.meta.url),'utf8'));
assert.equal(schema.properties.evidence_authority_version.const,'0.1');
assert.ok(INTENT_EVIDENCE_CLASSES.includes('MODEL_INFERENCE'));
assert.deepEqual(INTENT_EVIDENCE_STATUSES,['PASS','FAIL','UNKNOWN','NOT_RUN','STALE','CONFLICTED']);
assert.equal(verificationSchema.properties.overall_status.enum.includes('CONFLICTED'),true);
const bundle={evidence_authority_version:'0.1',bundle_id:'bundle.test',intent_manifest_id:'manifest.test',observations:[{id:'obs.test',status:'PASS',statement:'test passed',provenance:{producer_kind:'test_runner',producer_id:'node:test',verification_method:'test_execution'},observed_at:'2026-09-06T00:00:00.000Z'}],evidence:[{id:'ev.test',evidence_class:'UNIT',statement:'unit result',observation_ids:['obs.test'],evidence_requirement_ids:['req.test']}]};
assert.equal(validateIntentEvidenceBundle(bundle).valid,true,validateIntentEvidenceBundle(bundle).errorMessage);
const reordered={...bundle,evidence:[{...bundle.evidence[0],evidence_requirement_ids:['req.test']}],observations:[{...bundle.observations[0]}]};
assert.equal(canonicalIntentEvidenceJson(bundle),canonicalIntentEvidenceJson(reordered));
const bad=structuredClone(bundle);bad.evidence[0].observation_ids=['obs.missing'];assert.equal(validateIntentEvidenceBundle(bad).valid,false);
console.log('Intent Evidence Authority protocol tests passed');
