/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ApprovalBroker,
  MemoryApprovalProvider,
  applyApprovalResult,
  buildApprovalRequest,
  approvalRequestDigest,
  buildApprovalResult,
  evaluatePermissionRequest,
  issueExecutionLease,
  verifyApprovalRequest,
  verifyApprovalResult,
  verifyExecutionLease,
  buildAuthorityGraph
} from '../src/index.js';
import { validateApprovalRequest, validateApprovalResult, validateDecisionReceipt, validateExecutionLease } from '@ruleoak/protocol';

const t0='2026-08-27T05:00:00.000Z';
const call={call_id:'call_approval_v1',timestamp:t0,actor:{type:'agent',id:'agent:approval',name:'approval-agent',session_id:'sess-approval'},tool:{name:'email.send',category:'email',operation:'send'},target:{resource:'partner@example.com',scope:'external',sensitivity:'internal'},arguments:{to:'partner@example.com',body:'hello'},context:{purpose:'test'}};
const policy={policyVersion:2,defaultAction:'needs_approval',rules:[]};
const pending=evaluatePermissionRequest(call,policy,{evaluatedAt:t0,receiptTtlMs:10*60*1000});
assert.equal(pending.decision.action,'needs_approval');
assert.equal(pending.decision.receipt.receipt_version,'1.1');

const request=buildApprovalRequest(pending,{approvalId:'appr_exact_1',requestedAt:'2026-08-27T05:01:00.000Z',ttlMs:5*60*1000,issuer:'ruleoak-test',providerId:'provider:test',audience:'approval-provider:test'});
assert.equal(validateApprovalRequest(request).valid,true);
assert.equal(verifyApprovalRequest(request,{now:'2026-08-27T05:02:00.000Z',permissionResult:pending}).ok,true);
assert.equal('arguments' in request.normalized_call,false,'ApprovalRequest must not copy raw tool arguments');
assert.equal('context' in request.normalized_call,false,'ApprovalRequest must not copy arbitrary call context');
assert.equal(verifyApprovalRequest({...request,summary:'tampered'},{now:'2026-08-27T05:02:00.000Z'}).ok,false);

assert.throws(()=>buildApprovalRequest(pending,{approvalId:'appr_missing_provider',requestedAt:'2026-08-27T05:01:00.000Z'}),/providerId is required/,'ApprovalRequest must bind an explicit provider identity');
const nestedLeak={...request,normalized_call:{...request.normalized_call,arguments:{secret:'must-not-cross-provider-boundary'}}};
nestedLeak.request_digest=approvalRequestDigest(nestedLeak);
assert.equal(validateApprovalRequest(nestedLeak).valid,false,'ApprovalRequest protocol must reject nested raw arguments even with a recomputed digest');
const topLevelExtra={...request,private_context:{secret:'must-not-cross-provider-boundary'}};
topLevelExtra.request_digest=approvalRequestDigest(topLevelExtra);
assert.equal(validateApprovalRequest(topLevelExtra).valid,false,'ApprovalRequest protocol must reject undeclared top-level fields');

const approvalSecret='approval-v1-secret';
const result=buildApprovalResult(request,'allow_once',{providerId:'provider:test',providerName:'Test provider',approver:{type:'user',id:'user:reviewer',name:'Reviewer'},decidedAt:'2026-08-27T05:02:00.000Z',ttlMs:3*60*1000,secret:approvalSecret,reason:'reviewed exact action'});
assert.equal(validateApprovalResult(result).valid,true);
assert.equal(verifyApprovalResult(result,request,{now:'2026-08-27T05:02:30.000Z',secret:approvalSecret,requireSignature:true,providerId:'provider:test'}).ok,true);
assert.equal(verifyApprovalResult({...result,provider_name:'tampered'},request,{now:'2026-08-27T05:02:30.000Z',secret:approvalSecret}).ok,false);
assert.equal(verifyApprovalResult(result,{...request,action_digest:'sha256:'+'0'.repeat(64)},{now:'2026-08-27T05:02:30.000Z',secret:approvalSecret}).ok,false);

assert.throws(()=>applyApprovalResult(pending,request,result,{...policy,defaultAction:'deny'},{now:'2026-08-27T05:02:30.000Z',secret:approvalSecret,requireSignature:true,providerId:'provider:test'}),/policy changed/);
const approved=applyApprovalResult(pending,request,result,policy,{now:'2026-08-27T05:02:30.000Z',secret:approvalSecret,requireSignature:true,providerId:'provider:test'});
assert.equal(approved.decision.action,'allow');
assert.equal(approved.decision.receipt.receipt_version,'1.2');
assert.equal(approved.decision.receipt.approval_id,request.approval_id);
assert.equal(approved.decision.receipt.approval_result_id,result.approval_result_id);
assert.equal(validateDecisionReceipt(approved.decision.receipt).valid,true);

const dir=mkdtempSync(join(tmpdir(),'ruleoak-approval-use-'));
try{
  const lease=issueExecutionLease(approved,policy,{issuedAt:'2026-08-27T05:03:00.000Z',ttlMs:60_000,approvalRequest:request,approvalResult:result,approvalSecret,requireApprovalSignature:true,approvalUseStoreDir:dir});
  assert.equal(lease.lease_version,'1.2');
  assert.equal(lease.approval_id,request.approval_id);
  assert.equal(lease.approval_result_id,result.approval_result_id);
  assert.equal(validateExecutionLease(lease).valid,true);
  assert.equal(verifyExecutionLease(lease,call,policy,{now:'2026-08-27T05:03:30.000Z',requireSignature:false}).ok,true);

  const graph=buildAuthorityGraph({decisions:[pending.decision.receipt,approved.decision.receipt],approvals:[{...request,status:'decided',decided_at:result.decided_at,approval_result:result}],leases:[lease]},{generatedAt:'2026-08-27T05:03:10.000Z'});
  assert.ok(graph.edges.some(e=>e.from===`approval:${request.approval_id}`&&e.to===`decision:${approved.decision.receipt.decision_id}`&&e.relation==='resolves_to_decision'));
  assert.ok(graph.edges.some(e=>e.from===`approval:${request.approval_id}`&&e.to===`lease:${lease.lease_id}`&&e.relation==='approves_lease'));

  assert.throws(()=>issueExecutionLease(approved,policy,{issuedAt:'2026-08-27T05:03:10.000Z',ttlMs:60_000,approvalRequest:request,approvalResult:result,approvalSecret,requireApprovalSignature:true,approvalUseStoreDir:dir}),/already consumed/,'one ApprovalResult must not issue two leases');
} finally { rmSync(dir,{recursive:true,force:true}); }

const deniedResult=buildApprovalResult(request,'deny_once',{providerId:'provider:test',approver:{type:'user',id:'user:reviewer'},decidedAt:'2026-08-27T05:02:00.000Z'});
const denied=applyApprovalResult(pending,request,deniedResult,policy,{now:'2026-08-27T05:02:01.000Z',providerId:'provider:test'});
assert.equal(denied.decision.action,'deny');

const provider=new MemoryApprovalProvider({providerId:'provider:memory',secret:approvalSecret,approver:{type:'user',id:'user:memory-reviewer'}});
const broker=new ApprovalBroker(provider);
const submitted=await broker.request(pending,{approvalId:'appr_memory',requestedAt:'2026-08-27T05:01:00.000Z'});
assert.equal(submitted.response.status,'pending');
const providerResult=await broker.decide(submitted.request.approval_id,'allow_once',{context:{decidedAt:'2026-08-27T05:02:00.000Z'}});
assert.equal(providerResult.approval_result_version,'1.0');
assert.equal(providerResult.decision,'allow');
assert.equal(verifyApprovalResult(providerResult,submitted.request,{now:providerResult.decided_at,secret:approvalSecret,requireSignature:true,providerId:'provider:memory'}).ok,true);

assert.equal(verifyApprovalResult(result,request,{now:'2026-08-27T05:10:00.000Z',secret:approvalSecret}).ok,false,'expired ApprovalResult must fail');

const dynamicBase=Date.now()-10_000;
const dynamicCall={...call,call_id:'call_expired_resolution',timestamp:new Date(dynamicBase).toISOString()};
const dynamicPending=evaluatePermissionRequest(dynamicCall,policy,{evaluatedAt:new Date(dynamicBase).toISOString(),receiptTtlMs:20_000});
const dynamicRequest=buildApprovalRequest(dynamicPending,{providerId:'provider:test',requestedAt:new Date(dynamicBase+1_000).toISOString(),ttlMs:10_000});
const dynamicResult=buildApprovalResult(dynamicRequest,'allow_once',{providerId:'provider:test',approver:{type:'user',id:'user:reviewer'},decidedAt:new Date(dynamicBase+2_000).toISOString(),ttlMs:1_000});
assert.throws(()=>applyApprovalResult(dynamicPending,dynamicRequest,dynamicResult,policy),/expired/,'applyApprovalResult must verify expiry at resolution time when now is omitted');
console.log('Approval Contract core tests passed');
