/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { diffPolicies, simulatePolicy } from '../src/index.js';
const call={call_id:'sim',timestamp:'2026-01-01T00:00:00Z',actor:{type:'agent',name:'a',session_id:'s'},tool:{name:'filesystem.read',category:'file',operation:'read'},target:{resource:'./public/a.txt',scope:'local',sensitivity:'public'},arguments:{},context:{}};
const before={policyVersion:2,defaultAction:'deny',rules:[{id:'read',effect:'allow',actions:['filesystem.read'],resources:['./public/**']}]};
const sim=simulatePolicy(call,before,{evaluatedAt:'2026-01-01T00:00:00Z'});assert.equal(sim.ok,true);assert.equal(sim.decision.action,'allow');assert.ok(sim.policy_digest.startsWith('sha256:'));
const after={...before,defaultAction:'needs_approval',rules:[{...before.rules[0],resources:['./public/**','./docs/**']},{id:'write',effect:'needs_approval',actions:['filesystem.write'],resources:['./public/**']}]};
const diff=diffPolicies(before,after);assert.equal(diff.ok,true);assert.equal(diff.changed,true);assert.ok(diff.broad.defaultAction);assert.equal(diff.structured_rules.added[0].id,'write');assert.ok(diff.structured_rules.modified.some(r=>r.id==='read'&&r.fields.includes('resources')));
assert.equal(diffPolicies({policyVersion:99},after).ok,false);
console.log('Policy simulation/diff tests passed');
