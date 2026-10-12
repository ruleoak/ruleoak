/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRepositoryUnderstanding } from '../src/brownfield-understanding.js';
import { analyzeSemanticImpact, tokenizeImpactText, validateSemanticImpact } from '../src/semantic-impact.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-impact-semantic-impact-'));
mkdirSync(join(root,'src'),{recursive:true});mkdirSync(join(root,'tests'),{recursive:true});mkdirSync(join(root,'.ruleoak','intent'),{recursive:true});
writeFileSync(join(root,'package.json'),JSON.stringify({name:'impact-sample',version:'1.0.0',type:'module'},null,2));
writeFileSync(join(root,'src','base.js'),'export const run=()=>true;\n');
writeFileSync(join(root,'src','gateway.js'),"import { run } from './base.js';\nexport const gate=()=>run();\n");
writeFileSync(join(root,'tests','base.test.js'),"import { run } from '../src/base.js';\nif(!run())throw new Error('bad');\n");
const intent={
 intent_manifest_version:'0.1',manifest_id:'manifest.impact.sample',product:{id:'product.sample',name:'Impact Sample'},
 capabilities:[
  {id:'cap.base',name:'Base authorization',tags:['authorization','retry','effect'],invariant_ids:['inv.base'],budget_ids:['budget.base'],authority_ids:['authority.base'],risk_ids:['risk.base'],evidence_requirement_ids:['evidence.base']},
  {id:'cap.gateway',name:'Gateway boundary',tags:['gateway','protocol'],dependency_ids:['dep.gateway-base']}
 ],
 invariants:[{id:'inv.base',statement:'Effects must not retry without verification.',capability_ids:['cap.base']}],
 budgets:[{id:'budget.base',metric:'authorization_p99_ms',operator:'max',value:10,unit:'ms',capability_ids:['cap.base']}],
 authorities:[{id:'authority.base',statement:'The evaluator owns authorization.',authority_kind:'decision_owner',source:'sample evaluator',capability_ids:['cap.base']}],
 risks:[{id:'risk.base',statement:'Blind retry duplicates effects.',severity:'critical',capability_ids:['cap.base'],invariant_ids:['inv.base']}],
 dependencies:[{id:'dep.gateway-base',from_capability_id:'cap.gateway',to_capability_id:'cap.base',dependency_type:'required'}],
 evidence_requirements:[{id:'evidence.base',statement:'Base requires unit evidence.',evidence_types:['unit'],capability_ids:['cap.base']}]
};
writeFileSync(join(root,'.ruleoak','intent','sample.intent.json'),JSON.stringify(intent,null,2));
writeFileSync(join(root,'.ruleoak','intent','sample.binding.json'),JSON.stringify({binding_version:'0.1',intent_manifest_id:'manifest.impact.sample',implementation_id:'impl.sample',language:'JavaScript',capability_bindings:[{capability_id:'cap.base',modules:['src/base.js']},{capability_id:'cap.gateway',modules:['src/gateway.js']}]},null,2));
const graph=buildRepositoryUnderstanding(root);

assert.deepEqual(tokenizeImpactText('Verified retries and authorisation'),['authorization','retry','verify']);
const impact=analyzeSemanticImpact(graph,'strengthen effect authorization and retry verification');
assert.equal(validateSemanticImpact(impact).valid,true,validateSemanticImpact(impact).errorMessage);
assert.deepEqual(impact.affected_capability_ids,['cap.base','cap.gateway']);
assert.equal(impact.direct_capabilities[0].capability_id,'cap.base');
assert.equal(impact.transitive_capabilities[0].capability_id,'cap.gateway');
assert.ok(impact.relevant.invariants.some(x=>x.id==='inv.base'));
assert.ok(impact.relevant.authorities.some(x=>x.id==='authority.base'));
assert.ok(impact.implementation_surfaces.some(x=>x.relative_path==='src/base.js'));
assert.deepEqual(impact.evidence.required_types,['unit']);
assert.deepEqual(impact.evidence.verified_types,[]);
assert.equal(impact.evidence.status,'UNKNOWN');
assert.ok(impact.evidence.candidate_tests.some(x=>x.relative_path==='tests/base.test.js'));
assert.equal(impact.conflicts.length,0,'strengthening request must not manufacture a conflict');

const weakening=analyzeSemanticImpact(graph,'allow blind retry without effect verification');
assert.ok(weakening.conflicts.some(x=>x.type==='invariant'&&x.protected_intent_id==='inv.base'));
assert.equal(weakening.risk.level,'CRITICAL');

const budget=analyzeSemanticImpact(graph,'raise authorization latency to 25 ms');
assert.ok(budget.conflicts.some(x=>x.type==='budget'&&x.protected_intent_id==='budget.base'&&x.status==='CONFLICT'));

const unknown=analyzeSemanticImpact(graph,'change login screen color');
assert.deepEqual(unknown.affected_capability_ids,[]);
assert.equal(unknown.risk.level,'UNKNOWN');
assert.ok(unknown.uncertainties.some(x=>x.code==='requested_change_unresolved'));

assert.throws(()=>analyzeSemanticImpact(graph,''),/non-empty/);
assert.throws(()=>analyzeSemanticImpact({understanding_version:'9'},'change effect'),/Repository Understanding v0\.1/);
console.log('Semantic Impact unit tests passed');
