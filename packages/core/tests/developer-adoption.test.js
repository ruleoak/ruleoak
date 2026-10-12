/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak, getRuleOakMetadata, RuleOakApprovalRequiredError } from '../src/index.js';

function workspaceWith(policy) {
  const root = mkdtempSync(join(tmpdir(), 'ruleoak-sdk-'));
  const workspace = join(root, '.ruleoak');
  mkdirSync(workspace, { recursive: true });
  writeFileSync(join(workspace, 'policy.json'), JSON.stringify(policy, null, 2));
  return workspace;
}

const allowPolicy = {
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [{ id: 'allow-search', effect: 'allow', actions: ['search'], resources: ['*'], priority: 100 }]
};
const workspace = workspaceWith(allowPolicy);
const ruleoak = await createRuleOak({ workspace, receiptMode: 'automatic' });
let calls = 0;
const tools = ruleoak.guardTools({
  search: async query => {
    calls += 1;
    return { query, matches: 1 };
  }
});
const value = await tools.search('oak');
assert.equal(calls, 1, 'guarded tool executes exactly once');
assert.equal(value.matches, 1);
assert.ok(getRuleOakMetadata(value)?.decision_id);
assert.ok(ruleoak.lastExecution?.evidence_event_id);

const deniedWorkspace = workspaceWith({ policyVersion: 2, defaultAction: 'deny', rules: [] });
const denied = await createRuleOak({ workspace: deniedWorkspace });
const guardedDelete = denied.guardFunction({
  name: 'filesystem.delete',
  category: 'file',
  operation: 'delete',
  resource: './protected.txt',
  execute: async () => { throw new Error('must not execute'); }
});
await assert.rejects(() => guardedDelete(), error => error.code === 'RULEOAK_DENIED');

const approvalWorkspace = workspaceWith({
  policyVersion: 2,
  defaultAction: 'needs_approval',
  rules: []
});
const approval = await createRuleOak({ workspace: approvalWorkspace });
const guardedApproval = approval.guardFunction({
  name: 'custom.execute',
  execute: async () => 'unexpected'
});
await assert.rejects(() => guardedApproval(), error => error instanceof RuleOakApprovalRequiredError && error.code === 'RULEOAK_APPROVAL_REQUIRED');

const immediateProvider = {
  apiVersion: '1.0',
  name: 'test-immediate',
  request(request) { return { approval_id: request.approval_id, decision: 'allow_once', reason: 'test approval' }; }
};
const approved = await createRuleOak({ workspace: approvalWorkspace, approvalProvider: immediateProvider });
let approvedCalls = 0;
const approvedFn = approved.guardFunction({
  name: 'custom.execute',
  execute: async () => { approvedCalls += 1; return 42; },
  resultMode: 'envelope'
});
const envelope = await approvedFn();
assert.equal(envelope.value, 42);
assert.equal(approvedCalls, 1);
assert.ok(envelope.ruleoak.decision_id);

console.log('core developer adoption tests passed');
