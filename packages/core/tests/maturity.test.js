/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {
  evaluatePermissionRequest,
  lintPolicy,
  signDecisionReceipt,
  verifyDecisionReceipt,
  verifyExecutionGrant
} from '../src/index.js';

const call = {
  call_id: 'call_maturity_read',
  timestamp: '2026-01-01T00:00:00.000Z',
  actor: { type: 'agent', name: 'maturity-test', session_id: 'sess_maturity' },
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

const lint = lintPolicy(policy);
assert.equal(lint.valid, true);
assert.equal(lint.errors.length, 0);
assert.ok(lintPolicy({ defaultAction: 'allow' }).warnings.some(warning => warning.includes('defaultAction is allow')));
assert.equal(lintPolicy({ exactActionRules: [
  { effect: 'allow', decision_key: 'same' },
  { effect: 'deny', decision_key: 'same' }
] }).valid, false);

const secret = 'test-only-receipt-secret';
const result = evaluatePermissionRequest(call, policy, {
  evaluatedAt: '2026-01-01T00:00:00.000Z',
  receiptTtlMs: 60_000,
  receiptSecret: secret
});
assert.equal(result.decision.action, 'allow');
assert.ok(result.decision.receipt.signature.startsWith('hmac-sha256:'));
assert.equal(verifyExecutionGrant(result.decision.receipt, call, policy, secret, { now: '2026-01-01T00:00:30.000Z' }).ok, true);
assert.equal(verifyExecutionGrant(result.decision.receipt, { ...call, target: { ...call.target, resource: './public/other.txt' } }, policy, secret, { now: '2026-01-01T00:00:30.000Z' }).ok, false);
assert.equal(verifyDecisionReceipt(result.decision.receipt, { secret, now: '2026-01-01T00:02:00.000Z' }).ok, false);

const tampered = signDecisionReceipt({ ...result.decision.receipt, decision: 'deny', signature: undefined }, secret);
assert.equal(verifyExecutionGrant(tampered, call, policy, secret, { now: '2026-01-01T00:00:30.000Z' }).ok, false);

console.log('core maturity tests passed');
