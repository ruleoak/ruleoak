/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {buildReviewProfile,buildReviewReceipt,compareReviewReceipts} from '../packages/cli/src/review-continuity.js';
const profile=buildReviewProfile({intentFile:'intent.json',bindingFiles:['binding.json'],memoryFiles:['memory.json'],noHandoff:true});assert.equal(profile.review_profile_version,'0.1');
const mk=(candidate,policy,decision='VERIFIED_FOR_DECLARED_SCOPE',status='PASS')=>({status:'VERIFIED',implementation:{source_sha256:candidate},candidate_review:{decision,changed_behavior:{affected_capability_ids:['cap.a']},unknowns:[]},qualification:{bindings:{candidate_sha256:candidate,baseline_sha256:'base-a',intent_manifest_sha256:'intent-a',policy_sha256:policy},results:[{id:'oracle-a',status}]},verification:{requirements:[{requirement_id:'ev.a',status,type_results:[{evidence_type:'unit',status}]}]}});
const prior=buildReviewReceipt(mk('cand-a','policy-a'),{createdAt:'2026-09-17T00:00:00Z'});const same=buildReviewReceipt(mk('cand-a','policy-a'),{createdAt:'2026-09-18T00:00:00Z'});const changedCandidate=buildReviewReceipt(mk('cand-b','policy-a'),{createdAt:'2026-09-18T00:00:00Z'});const changedRules=buildReviewReceipt(mk('cand-a','policy-b','PROTECTED_CHECKS_FAILED','FAIL'),{createdAt:'2026-09-18T00:00:00Z'});
assert.equal(compareReviewReceipts(prior,same).prior_evidence_reusable,true);assert.equal(compareReviewReceipts(prior,changedCandidate).prior_evidence_reusable,false);assert.deepEqual(compareReviewReceipts(prior,changedRules).invalidating_identity_changes,['qualification_policy_sha256']);
console.log('REVIEW_CONTINUITY_PASS profiles=1 same_identity_reuse=1 candidate_invalidation=1 policy_invalidation=1');
