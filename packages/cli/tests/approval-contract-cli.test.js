/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyApprovalRequest, verifyApprovalResult } from '@ruleoak/core';
import { checkCallFile, decidePendingApproval, initProject, listPendingApprovals, policyPath } from '../src/cli.js';

const dir=mkdtempSync(join(tmpdir(),'ruleoak-cli-approval-v1-'));
try{
  initProject(dir);
  writeFileSync(policyPath(dir),JSON.stringify({policyVersion:2,defaultAction:'needs_approval',rules:[]},null,2)+'\n');
  const callPath=join(dir,'call.json');
  writeFileSync(callPath,JSON.stringify({call_id:'call_cli_approval',timestamp:'2026-08-27T05:00:00.000Z',actor:{type:'agent',id:'agent:cli',name:'cli-agent',session_id:'sess-cli'},tool:{name:'email.send',category:'email',operation:'send'},target:{resource:'partner@example.com',scope:'external',sensitivity:'internal'},arguments:{body:'private body must not enter ApprovalRequest normalized_call'},context:{private_context:'must not enter ApprovalRequest normalized_call'}},null,2));
  const pending=checkCallFile(callPath,dir,undefined,'2026-08-27T05:00:00.000Z',{receiptTtlMs:10*60*1000});
  const request=pending.approval.record;
  assert.equal(request.approval_request_version,'1.0');
  assert.equal(verifyApprovalRequest(request,{now:'2026-08-27T05:01:00.000Z'}).ok,true);
  assert.equal(JSON.stringify(request).includes('private body must not enter'),false);
  assert.equal(JSON.stringify(request).includes('private_context'),false);
  const decided=decidePendingApproval(dir,request.approval_id,'allow_once','2026-08-27T05:02:00.000Z');
  assert.equal(decided.record.approval_result.approval_result_version,'1.0');
  assert.equal(decided.record.approval_result.decision,'allow');
  assert.equal(verifyApprovalResult(decided.record.approval_result,request,{now:'2026-08-27T05:02:01.000Z',providerId:'ruleoak.local-file-queue'}).ok,true);
  assert.equal(listPendingApprovals(dir).length,0);

  const pending2=checkCallFile(callPath,dir,undefined,'2026-08-27T06:00:00.000Z',{receiptTtlMs:60_000});
  const id2=pending2.approval.record.approval_id;
  assert.throws(()=>decidePendingApproval(dir,id2,'allow_once','2026-08-27T06:02:00.000Z'),/expired|positive validity window/);
  assert.equal(listPendingApprovals(dir).some(x=>x.approval_id===id2),true,'expired claimed approval must be restored to pending');
  assert.equal(existsSync(join(dir,'.ruleoak','pending',`${id2}.json`)),true);
  assert.equal(readFileSync(join(dir,'.ruleoak','pending',`${id2}.json`),'utf8').includes(id2),true);
  console.log('Approval Contract CLI tests passed');
} finally { rmSync(dir,{recursive:true,force:true}); }
