/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { evaluateIntentEvidence, claimProof } from '../src/intent-evidence-authority.js';
const AT='2026-09-06T12:00:00.000Z';
const manifest={intent_manifest_version:'0.1',manifest_id:'manifest.intent-evidence-authority.test',product:{id:'product.intent-evidence-authority',name:'Intent Evidence Authority'},capabilities:[{id:'cap.intent-evidence-authority',evidence_requirement_ids:['req.intent-evidence-authority']}],invariants:[{id:'inv.intent-evidence-authority',statement:'Agents cannot self-certify.',capability_ids:['cap.intent-evidence-authority']}],evidence_requirements:[{id:'req.intent-evidence-authority',statement:'Require unit and integration evidence.',evidence_types:['unit','integration'],capability_ids:['cap.intent-evidence-authority']}],claims:[{id:'claim.intent-evidence-authority',statement:'Intent Evidence Authority is independently evidenced.',capability_ids:['cap.intent-evidence-authority'],invariant_ids:['inv.intent-evidence-authority'],evidence_requirement_ids:['req.intent-evidence-authority']}]};
const obs=(id,status,producer_kind='test_runner',verification_method='test_execution',extra={})=>({id,status,statement:id,provenance:{producer_kind,producer_id:`producer:${id}`,verification_method},observed_at:'2026-09-06T10:00:00.000Z',...extra});
const ev=(id,cls,oid)=>({id,evidence_class:cls,statement:id,observation_ids:[oid],claim_ids:['claim.intent-evidence-authority'],evidence_requirement_ids:['req.intent-evidence-authority'],capability_ids:['cap.intent-evidence-authority']});
const bundle=(id,observations,evidence)=>({evidence_authority_version:'0.1',bundle_id:id,intent_manifest_id:'manifest.intent-evidence-authority.test',observations,evidence});

let r=evaluateIntentEvidence(manifest,[bundle('bundle.agent',[obs('obs.agent.unit','PASS','agent','self_assertion'),obs('obs.agent.int','PASS','model','model_inference')],[ev('ev.agent.unit','UNIT','obs.agent.unit'),ev('ev.agent.int','INTEGRATION','obs.agent.int')])],{at:AT});
assert.equal(r.overall_status,'UNKNOWN');assert.equal(r.coverage.percent,0);assert.equal(r.summary.independent_evidence_records,0);assert.equal(claimProof(r,'claim.intent-evidence-authority').claim.status,'UNKNOWN');

r=evaluateIntentEvidence(manifest,[bundle('bundle.pass',[obs('obs.unit','PASS'),obs('obs.int','PASS','ci','test_execution')],[ev('ev.unit','UNIT','obs.unit'),ev('ev.int','INTEGRATION','obs.int')])],{at:AT});
assert.equal(r.overall_status,'PASS');assert.equal(r.coverage.percent,100);assert.equal(r.claims[0].status,'PASS');

r=evaluateIntentEvidence(manifest,[bundle('bundle.fail',[obs('obs.unit','PASS'),obs('obs.int.fail','FAIL','ci','test_execution')],[ev('ev.unit','UNIT','obs.unit'),ev('ev.int.fail','INTEGRATION','obs.int.fail')])],{at:AT});
assert.equal(r.overall_status,'FAIL');

r=evaluateIntentEvidence(manifest,[bundle('bundle.conflict',[obs('obs.unit','PASS'),obs('obs.int.pass','PASS'),obs('obs.int.fail','FAIL')],[ev('ev.unit','UNIT','obs.unit'),ev('ev.int.pass','INTEGRATION','obs.int.pass'),ev('ev.int.fail','INTEGRATION','obs.int.fail')])],{at:AT});
assert.equal(r.overall_status,'CONFLICTED');assert.ok(r.contradictions.some(x=>x.evidence_requirement_id==='req.intent-evidence-authority'&&x.evidence_type==='integration'));

r=evaluateIntentEvidence(manifest,[bundle('bundle.stale',[obs('obs.unit.stale','PASS','test_runner','test_execution',{valid_until:'2026-09-06T11:00:00.000Z'}),obs('obs.int','PASS')],[ev('ev.unit.stale','UNIT','obs.unit.stale'),ev('ev.int','INTEGRATION','obs.int')])],{at:AT});
assert.equal(r.overall_status,'STALE');assert.equal(r.observations.find(x=>x.id==='obs.unit.stale').effective_status,'STALE');

r=evaluateIntentEvidence(manifest,[],{at:AT});assert.equal(r.overall_status,'NOT_RUN');assert.equal(r.coverage.percent,0);

r=evaluateIntentEvidence(manifest,[bundle('bundle.model',[obs('obs.model','PASS','test_runner','test_execution'),obs('obs.int','PASS')],[ev('ev.model','MODEL_INFERENCE','obs.model'),ev('ev.int','INTEGRATION','obs.int')])],{at:AT});assert.equal(r.requirements[0].type_results.find(x=>x.evidence_type==='unit').status,'NOT_RUN','MODEL_INFERENCE must not satisfy UNIT');

const bad=bundle('bundle.bad',[obs('obs.unit','PASS')],[{...ev('ev.unit','UNIT','obs.unit'),evidence_requirement_ids:['req.missing']}]);assert.throws(()=>evaluateIntentEvidence(manifest,[bad],{at:AT}),/unknown evidence requirement/);
console.log('Intent Evidence Authority unit tests passed');
