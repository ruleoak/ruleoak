/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildAuthorityGrant, delegateAuthorityGrant, isAuthorityGrantAttenuated, verifyAuthorityGrant,
  DelegationBudgetRegistry, RevocationRegistry, evaluatePermissionRequest, buildExecutionLease,
  verifyExecutionLease, consumeExecutionLease, buildAuthorityGraph
} from '../src/index.js';

const now='2026-08-27T05:00:00.000Z';
const secret='delegation-test-secret';
const cap=[{id:'project-write',actions:['resource.write'],resources:['ruleoak://file/project/**']}];
const root=buildAuthorityGrant({
  grant_version:'1.1',issuer:'user:owner',subject:{type:'agent',id:'agent-root'},
  principal_chain:[{type:'user',id:'user:owner'},{type:'agent',id:'agent-root'}],capabilities:cap,
  not_before:now,expires_at:'2026-08-27T06:00:00.000Z',ancestor_grant_ids:[],delegation_depth:0,
  budget:{max_executions:4,max_objects:10},
  obligations:[{type:'require_recorder'},{type:'require_effect_receipt'}],
  delegation:{allowed:true,max_depth:2,budget_mode:'partition'}
},{secret,issuedAt:now});

const dir=mkdtempSync(join(tmpdir(),'ruleoak-delegation-'));
const budgetRegistry=new DelegationBudgetRegistry({filePath:join(dir,'budgets.jsonl')});
const revocations=new RevocationRegistry({filePath:join(dir,'revocations.jsonl')});
const child1=delegateAuthorityGrant(root,{
  grant_id:'grant_child_1',subject:{type:'service',id:'svc-a'},
  capabilities:[{id:'child',actions:['resource.write'],resources:['ruleoak://file/project/build/**']}],
  budget:{max_executions:2,max_objects:6},
  obligations:[],delegation:{allowed:true,max_depth:2,budget_mode:'partition'}
},secret,{now,budgetRegistry,revocationRegistry:revocations});
assert.equal(child1.grant_version,'1.1');
assert.deepEqual(child1.ancestor_grant_ids,[root.grant_id]);
assert.equal(child1.obligations.some(x=>x.type==='require_recorder'),true,'parent obligations must be inherited');
assert.equal(isAuthorityGrantAttenuated(root,child1).ok,true);

const child2=delegateAuthorityGrant(root,{
  grant_id:'grant_child_2',subject:{type:'service',id:'svc-b'},
  capabilities:[{id:'child',actions:['resource.write'],resources:['ruleoak://file/project/docs/**']}],
  budget:{max_executions:2,max_objects:4},delegation:{allowed:false,max_depth:1,budget_mode:'partition'}
},secret,{now,budgetRegistry,revocationRegistry:revocations});
assert.equal(isAuthorityGrantAttenuated(root,child2).ok,true);
assert.throws(()=>delegateAuthorityGrant(root,{
  grant_id:'grant_child_3',subject:{type:'service',id:'svc-c'},capabilities:cap,
  budget:{max_executions:1,max_objects:1},delegation:{allowed:false,max_depth:1,budget_mode:'partition'}
},secret,{now,budgetRegistry,revocationRegistry:revocations}),/partition allocation exceeds remaining parent budget/);

const grandchild=delegateAuthorityGrant(child1,{
  grant_id:'grant_grandchild',subject:{type:'agent',id:'agent-leaf'},
  capabilities:[{id:'leaf',actions:['resource.write'],resources:['ruleoak://file/project/build/output/**']}],
  budget:{max_executions:1,max_objects:3},delegation:{allowed:false,max_depth:2,budget_mode:'partition'}
},secret,{now,budgetRegistry,revocationRegistry:revocations});
assert.deepEqual(grandchild.ancestor_grant_ids,[root.grant_id,child1.grant_id]);
assert.equal(isAuthorityGrantAttenuated(child1,grandchild).ok,true);
assert.throws(()=>delegateAuthorityGrant(grandchild,{subject:{type:'agent',id:'too-deep'},capabilities:grandchild.capabilities},secret,{now,budgetRegistry,revocationRegistry:revocations}),/does not allow delegation|max_depth/);

const manuallyWidened={...child1,budget:{max_executions:2},signature:undefined};
assert.equal(isAuthorityGrantAttenuated(root,manuallyWidened).ok,false,'omitting a parent-limited budget must be widening');
const obligationDrop={...child1,obligations:[{type:'require_effect_receipt'}],signature:undefined};
assert.equal(isAuthorityGrantAttenuated(root,obligationDrop).ok,false,'child may not drop inherited obligations');

const call={call_id:'delegation-call',timestamp:now,actor:{type:'service',id:'svc-a',name:'svc-a',session_id:'s'},tool:{name:'filesystem.write',category:'file',operation:'write'},target:{resource:'project/build/out.txt',scope:'local',sensitivity:'internal'},arguments:{},context:{}};
const policy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['project/build/**']}]};
assert.equal(evaluatePermissionRequest(call,policy,{authorityGrant:child1,authoritySecret:secret,revocationRegistry:revocations,evaluatedAt:now}).decision.action,'allow');
revocations.revoke('authority_grant',root.grant_id,{now,reason:'root stop',cascade:true});
assert.equal(verifyAuthorityGrant(grandchild,{secret,now,revocationRegistry:revocations}).ok,false,'root cascade must revoke descendants');
const denied=evaluatePermissionRequest(call,policy,{authorityGrant:child1,authoritySecret:secret,revocationRegistry:revocations,evaluatedAt:now});
assert.equal(denied.decision.action,'deny','central permission gateway must enforce direct-grant revocation');

// Lease validity is bounded by parent grant/decision and is exactly one-use.
const activeRoot=buildAuthorityGrant({
  grant_version:'1.1',issuer:'user:owner',subject:{type:'agent',id:'lease-agent'},principal_chain:[{type:'agent',id:'lease-agent'}],
  capabilities:[{actions:['resource.write'],resources:['ruleoak://file/project/**']}],not_before:now,expires_at:'2026-08-27T05:02:00.000Z',
  delegation_depth:0,ancestor_grant_ids:[],budget:{max_executions:1,max_objects:2},obligations:[],delegation:{allowed:false,max_depth:0,budget_mode:'inherit'}
},{secret,issuedAt:now});

// Envelope creation later than parent start must not backdate envelope validity.
const { buildAuthorityEnvelope } = await import('../src/authority/envelope.js');
const lateEnvelope=buildAuthorityEnvelope(activeRoot,{capabilities:activeRoot.capabilities},{authoritySecret:secret,issuedAt:'2026-08-27T05:01:00.000Z',now:'2026-08-27T05:01:00.000Z'});
assert.equal(lateEnvelope.not_before,'2026-08-27T05:01:00.000Z');

const leaseCall={...call,actor:{type:'agent',id:'lease-agent',name:'lease-agent',session_id:'s'},target:{...call.target,resource:'project/x.txt'}};
const leasePolicy={policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['project/**']}]};
const result=evaluatePermissionRequest(leaseCall,leasePolicy,{authorityGrant:activeRoot,authoritySecret:secret,evaluatedAt:now});
const issuanceRevocations=new RevocationRegistry({filePath:join(dir,'issuance-revocations.jsonl')});
const staleResult=evaluatePermissionRequest(leaseCall,leasePolicy,{authorityGrant:activeRoot,authoritySecret:secret,evaluatedAt:now});
issuanceRevocations.revoke('authority_grant',activeRoot.grant_id,{now,reason:'revoked after decision'});
assert.throws(()=>buildExecutionLease(staleResult,leasePolicy,{secret,issuedAt:now,authorityGrant:activeRoot,revocationRegistry:issuanceRevocations}),/revoked authority grant/,'revocation after decision must block lease issuance');
const lease=buildExecutionLease(result,leasePolicy,{secret,issuedAt:now,ttlMs:10*60*1000,authorityGrant:activeRoot});
assert.equal(lease.lease_version,'1.1');
assert.equal(lease.max_uses,1);
assert.ok(Date.parse(lease.expires_at)<=Date.parse(activeRoot.expires_at));
assert.deepEqual(lease.authority_principal_ids,['lease-agent']);
assert.throws(()=>buildExecutionLease(result,leasePolicy,{secret,issuedAt:now,maxUses:2}),/one-use/);
assert.equal(verifyExecutionLease(lease,leaseCall,leasePolicy,{secret,now,usage:{executions:1,objects:2},obligationContext:{}}).ok,true);
const leaseStore=join(dir,'lease-store');
const leaseRevocations=new RevocationRegistry({filePath:join(dir,'lease-revocations.jsonl')});
leaseRevocations.revoke('execution_lease',lease.lease_id,{now,reason:'stop before consume'});
assert.equal(consumeExecutionLease(lease,leaseCall,leasePolicy,{secret,now,storeDir:leaseStore,revocationRegistry:leaseRevocations,usage:{executions:1}}).ok,false);

const graph=buildAuthorityGraph({grants:[root,child1,child2,grandchild],leases:[lease]});
const childNode=graph.nodes.find(n=>n.node_id===`grant:${child1.grant_id}`);
assert.equal(childNode.data.delegation.budget_mode,'partition');
assert.equal(childNode.data.obligation_count,2);
assert.deepEqual(childNode.data.ancestor_grant_ids,[root.grant_id]);
assert.ok(graph.edges.some(e=>e.relation==='ancestor_of'));

// Tampering with revocation log must fail closed.
const revPath=join(dir,'tampered-revocations.jsonl');
const tamperRegistry=new RevocationRegistry({filePath:revPath});
tamperRegistry.revoke('principal','agent-x',{now,cascade:true});
const rec=JSON.parse(readFileSync(revPath,'utf8'));rec.reason='changed';writeFileSync(revPath,JSON.stringify(rec)+'\n');
assert.throws(()=>tamperRegistry.list(),/record_digest mismatch/);

console.log('Delegation & Revocation tests passed');
