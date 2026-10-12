/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeSemanticDiff } from '../src/semantic-diff.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-semantic-diff-'));
function manifest(id,budget=5,withInv=true){return{intent_manifest_version:'0.1',manifest_id:id,product:{id:'product.demo',name:'Demo'},capabilities:[{id:'cap.play',goal_ids:['goal.play'],invariant_ids:withInv?['inv.single']:[],budget_ids:['budget.latency'],authority_ids:['authority.play'],evidence_requirement_ids:['evidence.play']}],goals:[{id:'goal.play',statement:'Play the selected station.',capability_ids:['cap.play']}],invariants:withInv?[{id:'inv.single',statement:'Only the selected station is audible.',capability_ids:['cap.play']}]:[],budgets:[{id:'budget.latency',metric:'switch_ms',operator:'max',value:budget,unit:'ms',capability_ids:['cap.play']}],authorities:[{id:'authority.play',statement:'Player state is authoritative.',authority_kind:'state_source',source:'player',capability_ids:['cap.play']}],evidence_requirements:[{id:'evidence.play',statement:'Playback requires integration evidence.',evidence_types:['integration'],capability_ids:['cap.play']}],claims:[{id:'claim.play',statement:'Playback is qualified.',capability_ids:['cap.play'],invariant_ids:withInv?['inv.single']:[],evidence_requirement_ids:['evidence.play']}]};}
function makeDir(name,m,source='export const x=1;\n',extra=null){const d=join(root,name);mkdirSync(join(d,'.ruleoak','intent'),{recursive:true});mkdirSync(join(d,'src'),{recursive:true});writeFileSync(join(d,'.ruleoak','intent','demo.intent.json'),JSON.stringify(m,null,2));writeFileSync(join(d,'.ruleoak','intent','demo.binding.json'),JSON.stringify({binding_version:'0.1',intent_manifest_id:m.manifest_id,implementation_id:`impl.${name}`,language:'JavaScript',capability_bindings:[{capability_id:'cap.play',modules:['src/player.js']}]},null,2));writeFileSync(join(d,'src','player.js'),source);if(extra)writeFileSync(join(d,extra.path),extra.text);return d;}
const base=makeDir('base',manifest('manifest.base'));
const candidate=makeDir('candidate',manifest('manifest.candidate',10,false),'export const x=2;\n');
const r=analyzeSemanticDiff(base,candidate);
assert.equal(r.summary.intent_changed,true);
assert.ok(r.guarantees.weakened.some(x=>x.id==='inv.single'));
assert.ok(r.budgets.weakened.some(x=>x.id==='budget.latency'));
assert.ok(r.implementation_changes.some(x=>x.path==='src/player.js'&&x.capability_ids.includes('cap.play')));
assert.ok(r.evidence.invalidated_requirements.some(x=>x.evidence_requirement_id==='evidence.play'));
assert.equal(r.user_visible_behavior.actual_runtime_effect,'UNKNOWN');
assert.equal(r.risks.assessment.level,'CRITICAL');
const sameA=makeDir('same-a',manifest('manifest.same'));
const sameB=makeDir('same-b',manifest('manifest.same'),'export const x=3;\n');
const s=analyzeSemanticDiff(sameA,sameB);
assert.equal(s.summary.intent_changed,false);
assert.equal(s.user_visible_behavior.status,'NO_DECLARED_BEHAVIOR_CHANGE');
assert.ok(s.uncertainties.some(x=>x.code==='implementation_without_intent_delta'));
assert.ok(s.evidence.invalidated_requirements.some(x=>x.evidence_requirement_id==='evidence.play'));
const docsA=makeDir('docs-a',manifest('manifest.docs'),undefined,{path:'README.md',text:'one\n'});
const docsB=makeDir('docs-b',manifest('manifest.docs'),undefined,{path:'README.md',text:'two\n'});
const d=analyzeSemanticDiff(docsA,docsB);
assert.equal(d.summary.intent_changed,false);
assert.equal(d.capability_changes.length,0);
assert.ok(d.implementation_changes.some(x=>x.path==='README.md'&&x.capability_ids.length===0));
assert.ok(d.uncertainties.some(x=>x.code==='unbound_implementation_change'));
console.log('Semantic Diff engine tests passed');
