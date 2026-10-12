/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildReviewProfile,writeReviewProfile,loadReviewProfile,applyReviewProfile,buildReviewReceipt,writeReviewReceipt,loadReviewReceipt,compareReviewReceipts} from '../src/review-continuity.js';
const dir=mkdtempSync(join(tmpdir(),'ruleoak-review-continuity-'));
const profile=buildReviewProfile({intentFile:'intent.json',bindingFiles:['b.json'],memoryFiles:['m.json'],noHandoff:true});writeReviewProfile(profile,join(dir,'p.json'));assert.deepEqual(loadReviewProfile(join(dir,'p.json')),profile);assert.equal(applyReviewProfile(profile,{}).intentFile,'intent.json');assert.throws(()=>applyReviewProfile(profile,{intentFile:'other.json'}),/conflicts/);
const report=(candidate,policy,status='PASS')=>({status:'VERIFIED',implementation:{source_sha256:candidate},candidate_review:{decision:'VERIFIED_FOR_DECLARED_SCOPE',changed_behavior:{affected_capability_ids:['cap.a']},unknowns:[]},qualification:{bindings:{candidate_sha256:candidate,baseline_sha256:'base',intent_manifest_sha256:'intent',policy_sha256:policy},results:[{id:'oracle',status}]},verification:{requirements:[{requirement_id:'ev.a',status,evidence_types:['unit'],type_results:[{evidence_type:'unit',status}]}]}});
const a=buildReviewReceipt(report('cand1','policy1'),{createdAt:'2026-09-17T00:00:00Z'});writeReviewReceipt(a,join(dir,'a.json'));assert.deepEqual(loadReviewReceipt(join(dir,'a.json')),a);
const same=buildReviewReceipt(report('cand1','policy1'),{createdAt:'2026-09-18T00:00:00Z'});assert.equal(compareReviewReceipts(a,same).prior_evidence_reusable,true);
const changed=buildReviewReceipt(report('cand2','policy1'),{createdAt:'2026-09-18T00:00:00Z'});const c1=compareReviewReceipts(a,changed);assert.equal(c1.candidate_changed,true);assert.equal(c1.prior_evidence_reusable,false);
const rules=buildReviewReceipt(report('cand1','policy2','FAIL'),{createdAt:'2026-09-18T00:00:00Z'});const c2=compareReviewReceipts(a,rules);assert.deepEqual(c2.invalidating_identity_changes,['qualification_policy_sha256']);assert.equal(c2.evidence_status_changes[0].after,'FAIL');
console.log('Review continuity tests passed');
