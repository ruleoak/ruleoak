/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import {
  checkCallFile,
  decidePendingApproval,
  initProject,
  pendingDir,
  policyPath,
  protectCommand,
  ruleoakDir
} from '../src/cli.js';
import { choosePendingRecord, resolveApprovalChoice, runInteractiveApprovalInbox } from '../src/interactive.js';
import { LearningSession, applyLearningSuggestion, listLearningSuggestions } from '../src/learning.js';
import { EncryptedFileCredentialBackend, MemoryCredentialBackend, RuleOakSecretManager } from '../src/secrets.js';

function writeChild(dir) {
  const path = join(dir, 'child.mjs');
  writeFileSync(path, `let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{process.stdout.write(input);});`);
  return path;
}

function rpc(id, path, sensitivity = 'public') {
  return JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path, sensitivity } } }) + '\n';
}

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-low-friction-'));
try {
  const child = writeChild(dir);
  const output = new PassThrough();
  const errorOutput = new PassThrough();
  const first = await protectCommand(['node', child], dir, {
    inputChunks: [rpc(1, './public/a.txt')],
    approvalMode: 'queue',
    stdout: output,
    stderr: errorOutput,
    quiet: true,
    noReport: true,
    fixedTimestamp: '2026-01-01T00:00:00.000Z'
  });
  assert.equal(first.initialized, true);
  assert.equal(first.child_exit_code, 0);
  assert.equal(existsSync(policyPath(dir)), true);
  assert.equal(readdirSync(join(ruleoakDir(dir), 'consumed-receipts')).length, 1);

  const originalPolicy = readFileSync(policyPath(dir), 'utf8');
  await protectCommand(['node', child], dir, {
    inputChunks: [], approvalMode: 'queue', stdout: new PassThrough(), stderr: new PassThrough(), quiet: true, noReport: true
  });
  assert.equal(readFileSync(policyPath(dir), 'utf8'), originalPolicy);

  const answers = ['5', 'yes'];
  const approved = await protectCommand(['node', child], dir, {
    inputChunks: [rpc(2, './private/note.txt', 'private')],
    approvalMode: 'prompt',
    approvalAsk: async () => answers.shift(),
    approvalOutput: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    quiet: true,
    noReport: true,
    fixedTimestamp: '2026-01-01T00:01:00.000Z'
  });
  assert.equal(approved.child_exit_code, 0);
  assert.equal(readdirSync(join(ruleoakDir(dir), 'policy-suggestions')).length, 1);
  assert.equal(readFileSync(policyPath(dir), 'utf8'), originalPolicy);

  const learning = new LearningSession(dir, { sessionId: 'learn_test', startedAt: '2026-01-01T00:00:00.000Z' });
  const policy = JSON.parse(readFileSync(policyPath(dir), 'utf8'));
  for (const [index, path] of ['./public/one.txt', './public/two.txt'].entries()) {
    const callFile = join(dir, `learn-${index}.json`);
    writeFileSync(callFile, JSON.stringify({
      call_id: `learn_${index}`,
      timestamp: '2026-01-01T00:00:00.000Z',
      actor: { type: 'agent', name: 'learner', session_id: 'learn_test' },
      tool: { name: 'filesystem.read', category: 'file', operation: 'read' },
      target: { resource: path, scope: 'local', sensitivity: 'public' },
      arguments: { path }, context: {}
    }));
    learning.observe(checkCallFile(callFile, dir, undefined, '2026-01-01T00:00:00.000Z'));
  }
  const finalized = learning.finalize({ endedAt: '2026-01-01T00:02:00.000Z' });
  assert.ok(finalized.suggestions.some(item => item.kind === 'generalized'));
  assert.equal(JSON.parse(readFileSync(policyPath(dir), 'utf8')).rules.length, policy.rules.length);
  const candidate = listLearningSuggestions(dir).find(item => item.kind === 'generalized');
  const preview = applyLearningSuggestion(dir, candidate.suggestion_id, policy);
  assert.equal(preview.applied, false);
  const applied = applyLearningSuggestion(dir, candidate.suggestion_id, policy, { yes: true, appliedAt: '2026-01-01T00:03:00.000Z' });
  assert.equal(applied.applied, true);

  assert.equal(resolveApprovalChoice('1').decision, 'allow_once');
  assert.equal(choosePendingRecord([{ approval_id: 'a' }, { approval_id: 'b' }], '2').approval_id, 'b');
  const inboxRecord = { approval_id: 'interactive', normalized_call: { actor: {}, tool: {}, target: {} }, classification: {}, action: { arguments: {} } };
  const inboxAnswers = ['1', '1'];
  const inbox = await runInteractiveApprovalInbox([inboxRecord], async (id, decision) => ({ id, decision }), {
    output: new PassThrough(), ask: async () => inboxAnswers.shift()
  });
  assert.equal(inbox.decided, true);
  assert.equal(inbox.decision, 'allow_once');

  const callFile = join(dir, 'race.json');
  writeFileSync(callFile, JSON.stringify({
    call_id: 'race', timestamp: '2026-01-01T00:04:00.000Z', actor: { type: 'agent', name: 'race', session_id: 'race' },
    tool: { name: 'filesystem.read', category: 'file', operation: 'read' },
    target: { resource: './private/race.txt', scope: 'local', sensitivity: 'private' },
    arguments: { path: './private/race.txt' }, context: {}
  }));
  const pending = checkCallFile(callFile, dir, undefined, '2026-01-01T00:04:00.000Z');
  decidePendingApproval(dir, pending.approval.record.approval_id, 'deny_once', '2026-01-01T00:04:01.000Z');
  assert.throws(() => decidePendingApproval(dir, pending.approval.record.approval_id, 'allow_once'), /not found|already decided/);

  const stale = checkCallFile(callFile, dir, undefined, '2026-01-01T00:05:00.000Z');
  const changedPolicy = JSON.parse(readFileSync(policyPath(dir), 'utf8'));
  changedPolicy.description = 'changed after approval request';
  writeFileSync(policyPath(dir), JSON.stringify(changedPolicy, null, 2) + '\n');
  assert.throws(() => decidePendingApproval(dir, stale.approval.record.approval_id, 'allow_once'), /stale because policy changed/);
  assert.equal(existsSync(join(pendingDir(dir), `${stale.approval.record.approval_id}.json`)), true);

  const backend = new MemoryCredentialBackend();
  const manager = new RuleOakSecretManager(dir, { backend, env: {} });
  assert.equal(manager.status().stored, false);
  assert.equal(manager.init().created, true);
  const firstSecret = manager.getSecret().secret;
  assert.ok(firstSecret);
  assert.equal(manager.rotate().rotated, true);
  assert.notEqual(manager.getSecret().secret, firstSecret);
  assert.equal(manager.remove().removed, true);

  const encryptedBackend = new EncryptedFileCredentialBackend(join(ruleoakDir(dir), 'test-secrets.enc'), { passphrase: 'test-passphrase' });
  const fallbackManager = new RuleOakSecretManager(dir, { backend: encryptedBackend, env: {} });
  assert.equal(fallbackManager.init().created, true);
  assert.ok(fallbackManager.getSecret().secret);
  assert.equal(existsSync(join(ruleoakDir(dir), 'test-secrets.enc')), true);
  assert.equal(fallbackManager.remove().removed, true);

  const learnProtect = await protectCommand(['node', child], dir, {
    inputChunks: [rpc(8, './public/learn-a.txt'), rpc(9, './public/learn-b.txt')],
    approvalMode: 'queue', learn: true, stdout: new PassThrough(), stderr: new PassThrough(), quiet: true, noReport: true,
    learningSessionId: 'protect_learn_test', startedAt: '2026-01-01T00:10:00.000Z', endedAt: '2026-01-01T00:11:00.000Z', fixedTimestamp: '2026-01-01T00:10:00.000Z'
  });
  assert.ok(learnProtect.learning_suggestions >= 2);
  assert.equal(existsSync(learnProtect.learning_session), true);

  console.log('cli low-friction tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
