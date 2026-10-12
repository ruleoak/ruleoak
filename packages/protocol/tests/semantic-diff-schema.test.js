/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { SEMANTIC_DIFF_CHANGE_TYPES, SEMANTIC_DIFF_PROVENANCE, SEMANTIC_DIFF_VERSIONS, validateSemanticDiff } from '../src/semantic-diff.js';
assert.deepEqual(SEMANTIC_DIFF_VERSIONS,['0.1']);
assert.deepEqual(SEMANTIC_DIFF_PROVENANCE,['DETERMINISTIC','OBSERVED','INFERRED','UNKNOWN']);
assert.ok(SEMANTIC_DIFF_CHANGE_TYPES.includes('modified'));
const report={semantic_diff_version:'0.1',base:{label:'a',source_type:'intent_manifest',intent_manifest_id:'m.a',intent_digest:'sha256:a',repository_root:null},candidate:{label:'b',source_type:'intent_manifest',intent_manifest_id:'m.b',intent_digest:'sha256:b',repository_root:null},entity_changes:{capabilities:[]},capability_changes:[],implementation_changes:[],guarantees:{},budgets:{},authorities:{},user_visible_behavior:{},failure_behavior:{},compatibility:{},evidence:{},risks:{},uncertainties:[],summary:{}};
assert.equal(validateSemanticDiff(report).valid,true);
const bad=structuredClone(report);bad.semantic_diff_version='9';assert.equal(validateSemanticDiff(bad).valid,false);
console.log('Semantic Diff v0.1 protocol tests passed');
