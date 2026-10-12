/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {
  authorizeWithAuthorityGrant,
  buildAuthorityGrant,
  canonicalActionVocabulary,
  canonicalResourceIdentity,
  delegateAuthorityGrant,
  evaluatePermissionRequest,
  isAuthorityGrantAttenuated,
  verifyAuthorityGrant
} from '../src/index.js';

const secret = 'authority-test-secret';
const now = '2026-08-14T03:00:00.000Z';
const future = '2026-08-14T04:00:00.000Z';

function call({ id = 'agent-root', operation = 'read', resource = 'projects/research/a.txt', session = 'session-a' } = {}) {
  return {
    call_id: `call-${operation}`,
    timestamp: now,
    actor: { type: 'agent', id, name: id, session_id: session },
    tool: { name: `filesystem.${operation}`, category: 'file', operation },
    target: { resource, scope: 'local', sensitivity: 'internal' },
    arguments: {},
    context: {}
  };
}

const rootGrant = buildAuthorityGrant({
  issuer: 'user:owner',
  subject: { type: 'agent', id: 'agent-root' },
  principal_chain: [
    { type: 'user', id: 'user:owner' },
    { type: 'agent', id: 'agent-root' }
  ],
  capabilities: [
    { id: 'project-read', actions: ['resource.read'], resources: ['ruleoak://file/projects/**'] }
  ],
  not_before: now,
  expires_at: future,
  session_id: 'session-a',
  task_id: 'task-research',
  intent_id: 'intent-project-review'
}, { secret, issuedAt: now });

assert.equal(verifyAuthorityGrant(rootGrant, { secret, now }).ok, true);
assert.equal(canonicalActionVocabulary(call()), 'resource.read');
assert.equal(canonicalResourceIdentity(call()), 'ruleoak://file/projects/research/a.txt');

const allowed = authorizeWithAuthorityGrant(rootGrant, call(), { secret, now });
assert.equal(allowed.ok, true);
assert.equal(allowed.matchedCapability.id, 'project-read');

const writeDenied = authorizeWithAuthorityGrant(rootGrant, call({ operation: 'write' }), { secret, now });
assert.equal(writeDenied.ok, false);
assert.match(writeDenied.errors[0], /does not permit resource\.write/);

const subjectDenied = authorizeWithAuthorityGrant(rootGrant, call({ id: 'other-agent' }), { secret, now });
assert.equal(subjectDenied.ok, false);
assert.match(subjectDenied.errors.join(' '), /subject mismatch/);

const child = delegateAuthorityGrant(rootGrant, {
  subject: { type: 'agent', id: 'agent-child' },
  capabilities: [
    { id: 'research-read', actions: ['resource.read'], resources: ['ruleoak://file/projects/research/**'] }
  ]
}, secret, { now });
assert.equal(child.parent_grant_id, rootGrant.grant_id);
assert.equal(child.delegation_depth, 1);
assert.equal(child.principal_chain.at(-1).id, 'agent-child');
assert.equal(isAuthorityGrantAttenuated(rootGrant, child).ok, true);
assert.equal(authorizeWithAuthorityGrant(child, call({ id: 'agent-child' }), { secret, now }).ok, true);
assert.throws(() => delegateAuthorityGrant(rootGrant, {
  subject: { type: 'agent', id: 'agent-bad' },
  capabilities: [{ actions: ['resource.write'], resources: ['ruleoak://file/projects/**'] }]
}, secret, { now }), /exceeds parent/);

const policy = {
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [{
    id: 'allow-project-file-actions',
    effect: 'allow',
    actions: ['filesystem.*'],
    resources: ['projects/**'],
    conditions: { agentIds: ['agent-root'], principalIds: ['user:owner'], grantIds: [rootGrant.grant_id], intentIds: ['intent-project-review'], taskIds: ['task-research'] }
  }]
};
const gatewayAllowed = evaluatePermissionRequest(call(), policy, { authorityGrant: rootGrant, authoritySecret: secret, evaluatedAt: now });
assert.equal(gatewayAllowed.decision.action, 'allow');
assert.equal(gatewayAllowed.decision.receipt.authority_grant_id, rootGrant.grant_id);
assert.equal(gatewayAllowed.decision.receipt.principal_id, 'agent-root');
assert.equal(gatewayAllowed.decision.receipt.canonical_action, 'resource.read');
assert.equal(gatewayAllowed.decision.receipt.intent_id, 'intent-project-review');

const gatewayDenied = evaluatePermissionRequest(call({ operation: 'write' }), policy, { authorityGrant: rootGrant, authoritySecret: secret, evaluatedAt: now });
assert.equal(gatewayDenied.decision.action, 'deny');
assert.equal(gatewayDenied.decision.source, 'authority-grant');
assert.match(gatewayDenied.decision.reason, /authority grant/);

const expired = verifyAuthorityGrant(rootGrant, { secret, now: '2026-08-14T05:00:00.000Z' });
assert.equal(expired.ok, false);
assert.match(expired.errors.join(' '), /expired/);

console.log('core authority foundation tests passed');
