/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluatePermissionRequest, lintPolicy } from '@ruleoak/core';

const packDir = resolve('packages/cli/policy-packs');
const packs = Object.fromEntries(readdirSync(packDir).filter(name => name.endsWith('.json')).map(name => [name.replace(/\.json$/, ''), JSON.parse(readFileSync(resolve(packDir, name), 'utf8'))]));

for (const [name, policy] of Object.entries(packs)) {
  const lint = lintPolicy(policy);
  assert.equal(lint.valid, true, `${name} policy errors: ${lint.errors.join('; ')}`);
  assert.deepEqual(lint.warnings, [], `${name} policy warnings: ${lint.warnings.join('; ')}`);
  assert.equal(policy.policyVersion, 2, `${name} must use policyVersion 2`);
}

const base = {
  timestamp: '2026-01-01T00:00:00.000Z',
  actor: { type: 'agent', name: 'pack-test', session_id: 'pack-test' },
  context: {}
};
const call = (id, name, category, operation, sensitivity = 'public', scope = 'local') => ({
  ...base,
  call_id: id,
  tool: { name, category, operation },
  target: { resource: operation === 'delete' ? './protected/file.txt' : './workspace/file.txt', scope, sensitivity },
  arguments: {}
});

assert.equal(evaluatePermissionRequest(call('read', 'filesystem.read', 'file', 'read'), packs.cautious).decision.action, 'allow');
assert.equal(evaluatePermissionRequest(call('private', 'filesystem.read', 'file', 'read', 'private'), packs.cautious).decision.action, 'needs_approval');
assert.equal(evaluatePermissionRequest(call('delete', 'filesystem.delete', 'file', 'delete', 'private'), packs.cautious).decision.action, 'deny');
assert.equal(evaluatePermissionRequest(call('write', 'filesystem.write', 'file', 'write'), packs.readonly).decision.action, 'deny');
assert.equal(evaluatePermissionRequest(call('mcp-read', 'mcp.filesystem.read', 'file', 'read'), packs['mcp-server-safe']).decision.action, 'allow');

console.log('policy packs check passed');
