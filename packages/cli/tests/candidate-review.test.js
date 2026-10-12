/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCandidateReview,buildDevActivationSnapshot,writeDevActivationSnapshot} from '../src/candidate-review.js';

const base={
  status:'VERIFIED',outcome:'private prompt text',
  implementation:{source_path:'/private/example/project/candidate.zip'},
  scope_review:{valid:true,changes:[{path:'src/player.js',change_type:'modified'}],errors:[],warnings:[]},
  semantic_diff:{capability_changes:[{capability_id:'cap.play'}],implementation_changes:[{path:'src/player.js',change_type:'modified',provenance:'OBSERVED',capability_ids:['cap.play']}],user_visible_behavior:{declared_changes:[],actual_runtime_effect:'UNKNOWN'},failure_behavior:{declared_changes:[]},compatibility:{declared_changes:[]},evidence:{invalidated_requirements:[{evidence_requirement_id:'evidence.play',reason:'changed',provenance:'INFERRED'}]},risks:{assessment:{level:'MEDIUM'}},uncertainties:[{code:'runtime_unknown',statement:'runtime remains unknown',provenance:'UNKNOWN'}]},
  qualification:{results:[{id:'acceptance',status:'PASS',output:'secret output',output_sha256:'sha256:abc',qualification_binding:{capability_ids:['cap.play'],evidence_requirement_ids:['evidence.play']}}],policy_warnings:[]},
  verification:{status:'PASS',requirements:[{requirement_id:'evidence.play',status:'PASS',capability_ids:['cap.play'],type_results:[{evidence_type:'unit',status:'PASS'}]}]},
  handoff:{status:'NOT_REQUESTED'},model_usage:{role_calls:0,hosted_calls:0,total_tokens:0},human_interaction:{manual_ruleoak_subcommands:0}
};
const ok=buildCandidateReview(base,{durationMs:12.4});assert.equal(ok.decision,'VERIFIED_FOR_DECLARED_SCOPE');assert.equal(ok.changed_behavior.runtime_effect,'UNKNOWN');assert.equal(ok.local_metrics.review_duration_ms,12);assert.equal(ok.next_actions[0].kind,'REVIEW_OR_HANDOFF');
const failed=buildCandidateReview({...base,status:'FAILED',qualification:{results:[{id:'acceptance',status:'FAIL',diagnostic:'assertion failed',output_sha256:'sha256:def',qualification_binding:{capability_ids:['cap.play'],evidence_requirement_ids:['evidence.play']}}]},verification:{status:'FAIL',requirements:[{requirement_id:'evidence.play',status:'FAIL',capability_ids:['cap.play'],type_results:[{evidence_type:'unit',status:'FAIL'}]}]}});assert.equal(failed.decision,'PROTECTED_CHECKS_FAILED');assert.equal(failed.failed_checks[0].check_id,'acceptance');assert.equal(failed.next_actions.some(x=>x.kind==='FIX_PROTECTED_CHECK'),true);
const missing=buildCandidateReview({...base,status:'VERIFICATION_REQUIRED',qualification:{results:[]},verification:{status:'UNKNOWN',requirements:[{requirement_id:'evidence.device',status:'UNKNOWN',capability_ids:['cap.play'],type_results:[{evidence_type:'device',status:'UNKNOWN'}]}]}});assert.equal(missing.decision,'EVIDENCE_REQUIRED');assert.deepEqual(missing.missing_evidence[0].evidence_types,['device']);assert.equal(missing.next_actions.some(x=>x.kind==='PROVIDE_EVIDENCE'),true);
const blocked=buildCandidateReview({...base,status:'STOPPED',scope_review:{valid:false,changes:[],errors:['PROTECTED_FILE_CHANGED'],warnings:[]}});assert.equal(blocked.decision,'BLOCKED');assert.equal(blocked.next_actions[0].kind,'RESOLVE_SCOPE');
const snapshot=buildDevActivationSnapshot({...base,candidate_review:ok},{generatedAt:'2026-09-17T00:00:00.000Z'});const text=JSON.stringify(snapshot);for(const forbidden of ['private prompt text','/private/example','src/player.js','secret output','sha256:abc'])assert.equal(text.includes(forbidden),false,forbidden);assert.equal(snapshot.privacy.prompts_or_intent_text_included,false);assert.equal(snapshot.external_adoption_proven,false);
const dir=mkdtempSync(join(tmpdir(),'ruleoak-candidate-acceptance-review-')),path=writeDevActivationSnapshot(snapshot,join(dir,'activation.json'));assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),snapshot);
console.log('Candidate Acceptance Review unit tests passed');
