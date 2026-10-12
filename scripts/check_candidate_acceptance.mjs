/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDevDemo} from '../packages/cli/src/dev-frontdoor.js';
import {buildCandidateReview,buildDevActivationSnapshot} from '../packages/cli/src/candidate-review.js';
const contract=JSON.parse(readFileSync('qa/candidate-acceptance-review-contract.json','utf8'));
assert.equal(contract.contract_version,'1.0');
const demo=await runDevDemo({at:'2026-09-17T00:00:00.000Z'});
assert.equal(demo.status,'VERIFIED');assert.equal(demo.candidate_review?.decision,'VERIFIED_FOR_DECLARED_SCOPE');assert.equal(demo.model_usage.role_calls,0);assert.equal(demo.model_usage.total_tokens,0);assert.equal(demo.candidate_review?.changed_behavior?.runtime_effect,'UNKNOWN');assert.ok(demo.candidate_review?.next_actions?.length>0);
const missing=buildCandidateReview({status:'VERIFICATION_REQUIRED',scope_review:{valid:true,changes:[],errors:[],warnings:[]},semantic_diff:{capability_changes:[],implementation_changes:[],user_visible_behavior:{declared_changes:[],actual_runtime_effect:'UNKNOWN'},failure_behavior:{declared_changes:[]},compatibility:{declared_changes:[]},evidence:{invalidated_requirements:[]},risks:{assessment:{level:'LOW'}},uncertainties:[]},qualification:{results:[],policy_warnings:[]},verification:{requirements:[{requirement_id:'evidence.device',status:'UNKNOWN',capability_ids:['cap.device'],type_results:[{evidence_type:'device',status:'UNKNOWN'}]}]},model_usage:{role_calls:0,hosted_calls:0,total_tokens:0},human_interaction:{manual_ruleoak_subcommands:0},handoff:{status:'NOT_REQUESTED'}});assert.equal(missing.missing_evidence.length,1);assert.equal(missing.next_actions[0].kind,'PROVIDE_EVIDENCE');
const snapshot=buildDevActivationSnapshot({...demo,outcome:'DO NOT SHARE THIS PROMPT',implementation:{...demo.implementation,source_path:'/secret/repository.zip'}},{generatedAt:'2026-09-17T00:00:00.000Z'}),serialized=JSON.stringify(snapshot);assert.equal(snapshot.local_only,true);assert.equal(snapshot.external_adoption_proven,false);for(const forbidden of ['DO NOT SHARE THIS PROMPT','/secret/repository.zip'])assert.equal(serialized.includes(forbidden),false);
console.log(`Candidate Acceptance Review PASS: decision=${demo.candidate_review.decision}; zero-model=${demo.model_usage.role_calls===0}; activation-privacy=PASS; external-adoption=NOT_RUN`);
