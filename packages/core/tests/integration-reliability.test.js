/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ApprovalBroker,
  MemoryApprovalProvider,
  consumeExecutionGrant,
  evaluatePermissionRequest,
  listConsumedExecutionGrants,
  migratePolicyToV2,
  validateApprovalProvider
} from '../src/index.js';

const call = {
  call_id: 'call_v070_read',
  timestamp: '2026-01-01T00:00:00.000Z',
  actor: { type: 'agent', name: 'integration-test', session_id: 'sess_v070' },
  tool: { name: 'filesystem.read', category: 'file', operation: 'read' },
  target: { resource: './public/readme.txt', scope: 'local', sensitivity: 'public' },
  arguments: { path: './public/readme.txt' },
  context: {}
};
const policy = {
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [{ id: 'allow-public-read', effect: 'allow', actions: ['filesystem.read'], resources: ['./public/**'], riskAtMost: 'low' }]
};

const secret = 'v070-test-secret';
const result = evaluatePermissionRequest(call, policy, {
  evaluatedAt: '2026-01-01T00:00:00.000Z',
  receiptTtlMs: 60_000,
  receiptSecret: secret,
  receiptAudience: 'ruleoak-executor'
});
assert.equal(result.decision.receipt.receipt_version, '1.1');
assert.equal(result.decision.receipt.one_time, true);
assert.equal(result.decision.receipt.audience, 'ruleoak-executor');
assert.ok(result.decision.receipt.nonce);

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-consume-'));
try {
  const first = consumeExecutionGrant(result.decision.receipt, call, policy, secret, {
    storeDir: dir,
    now: '2026-01-01T00:00:30.000Z',
    consumedAt: '2026-01-01T00:00:30.000Z',
    executor: 'core-test',
    audience: 'ruleoak-executor'
  });
  assert.equal(first.ok, true);
  assert.equal(first.consumed, true);
  assert.equal(listConsumedExecutionGrants(dir).length, 1);

  const replay = consumeExecutionGrant(result.decision.receipt, call, policy, secret, {
    storeDir: dir,
    now: '2026-01-01T00:00:31.000Z',
    executor: 'core-test',
    audience: 'ruleoak-executor'
  });
  assert.equal(replay.ok, false);
  assert.equal(replay.replayed, true);

  const changed = consumeExecutionGrant(result.decision.receipt, { ...call, target: { ...call.target, resource: './public/changed.txt' } }, policy, secret, {
    storeDir: join(dir, 'changed'),
    now: '2026-01-01T00:00:30.000Z',
    executor: 'core-test',
    audience: 'ruleoak-executor'
  });
  assert.equal(changed.ok, false);
  assert.match(changed.errors.join(';'), /action digest mismatch/);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const legacy = {
  defaultAction: 'needs_approval',
  blockedActions: ['filesystem.delete'],
  approvalRequired: ['shell.*'],
  allowedActions: ['filesystem.read']
};
const migration = migratePolicyToV2(legacy, { migratedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(migration.changed, true);
assert.equal(migration.policy.policyVersion, 2);
assert.equal(migration.summary.rulesCreated, 3);
assert.equal(migration.policy.rules[0].effect, 'deny');
assert.equal(migration.policy.rules[1].effect, 'needs_approval');
assert.equal(migration.policy.rules[2].effect, 'allow');
assert.equal('blockedActions' in migration.policy, false);
assert.equal(migratePolicyToV2(migration.policy).changed, false);

const approvalResult = evaluatePermissionRequest({
  ...call,
  call_id: 'call_v070_email',
  tool: { name: 'email.send', category: 'email', operation: 'send' },
  target: { resource: 'user@example.com', scope: 'external', sensitivity: 'internal' },
  arguments: { to: 'user@example.com', body: 'hello' }
}, { policyVersion: 2, defaultAction: 'needs_approval', rules: [] }, { evaluatedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(approvalResult.decision.action, 'needs_approval');
const provider = new MemoryApprovalProvider();
assert.equal(validateApprovalProvider(provider).valid, true);
const broker = new ApprovalBroker(provider);
const requested = await broker.request(approvalResult, { requestedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(requested.response.accepted, true);
assert.equal((await broker.list()).length, 1);
const decided = await broker.decide(requested.request.approval_id, 'deny_once', { context: { decidedAt: '2026-01-01T00:01:00.000Z' } });
assert.equal(decided.approval_result_version, '1.0');
assert.equal(decided.decision, 'deny');
assert.equal(decided.decision_scope, 'deny_once');

console.log('core integration reliability tests passed');
