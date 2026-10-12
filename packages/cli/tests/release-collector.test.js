/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak } from '@ruleoak/core';
import { collectAgentReleaseSnapshot } from '../src/release-collector.js';
const root=mkdtempSync(join(tmpdir(),'ruleoak-release-collect-')),ws=join(root,'.ruleoak');mkdirSync(ws,{recursive:true});writeFileSync(join(ws,'policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'w',effect:'allow',actions:['filesystem.write'],resources:['*'],priority:100}]}));const file=join(root,'x.txt');const ro=await createRuleOak({workspace:ws});const fn=ro.guardFunction({name:'filesystem.write',category:'file',operation:'write',resource:()=>file,mapArguments:([content])=>({path:file,content}),execute:async content=>{writeFileSync(file,content);return{ok:true};}});await fn('x');const tests=join(root,'tests.json');writeFileSync(tests,JSON.stringify({suite_id:'smoke',suite_version:'1',task_success_rate:1,latency_ms:10,cost_usd:0,unsafe_tool_calls:0,critical_case_failures:[]}));const snapshot=collectAgentReleaseSnapshot(root,{testEvidence:tests,releaseId:'fixture-release-1'});assert.equal(snapshot.provenance.evidence_chain,'PASS');assert.equal(snapshot.provenance.effect_receipts,1);assert.equal(snapshot.provenance.verified_effects,1);assert.equal(snapshot.effect_verification_coverage,1);assert.equal(snapshot.ambiguous_effects,0);assert.equal(snapshot.duplicate_effects,0);assert.equal(snapshot.unsafe_tool_calls,0);assert.equal(snapshot.task_success_rate,1);console.log('Release evidence collector tests passed');
