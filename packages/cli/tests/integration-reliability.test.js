/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateApprovalProvider } from '@ruleoak/core';
import {
  checkCallFile,
  consumeReceiptFile,
  consumedReceiptReport,
  createFileQueueApprovalProvider,
  executeWithReceipt,
  initProject,
  migratePolicyFile,
  policyPath,
  writeDecisionReceipt
} from '../src/cli.js';

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-v070-'));
try {
  initProject(dir);
  const policy = {
    policyVersion: 2,
    defaultAction: 'deny',
    rules: [{ id: 'allow-public-read', effect: 'allow', actions: ['filesystem.read'], resources: ['./public/**'], riskAtMost: 'low' }]
  };
  writeFileSync(policyPath(dir), JSON.stringify(policy, null, 2) + '\n');
  const callFile = join(dir, 'read.json');
  writeFileSync(callFile, JSON.stringify({
    call_id: 'call_cli_v070',
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: { type: 'agent', name: 'cli-test', session_id: 'sess_cli_v070' },
    tool: { name: 'filesystem.read', category: 'file', operation: 'read' },
    target: { resource: './public/readme.txt', scope: 'local', sensitivity: 'public' },
    arguments: { path: './public/readme.txt' },
    context: {}
  }, null, 2));

  const secret = 'cli-v070-secret';
  const result = checkCallFile(callFile, dir, undefined, '2026-01-01T00:00:00.000Z', {
    receiptSecret: secret,
    receiptTtlMs: 60_000,
    receiptAudience: 'ruleoak-executor'
  });
  assert.equal(result.decision.action, 'allow');
  const receiptFile = join(dir, 'receipt.json');
  writeDecisionReceipt(result, receiptFile);

  const consumed = consumeReceiptFile(receiptFile, callFile, dir, undefined, {
    secret,
    executor: 'cli-test',
    now: '2026-01-01T00:00:30.000Z',
    consumedAt: '2026-01-01T00:00:30.000Z'
  });
  assert.equal(consumed.ok, true);
  assert.equal(consumedReceiptReport(dir).length, 1);
  const replayed = consumeReceiptFile(receiptFile, callFile, dir, undefined, {
    secret,
    executor: 'cli-test',
    now: '2026-01-01T00:00:31.000Z'
  });
  assert.equal(replayed.replayed, true);

  const execResultSource = checkCallFile(callFile, dir, undefined, '2026-01-01T00:01:00.000Z', {
    receiptSecret: secret,
    receiptTtlMs: 60_000,
    receiptAudience: 'ruleoak-executor'
  });
  const execReceipt = join(dir, 'exec-receipt.json');
  writeDecisionReceipt(execResultSource, execReceipt);
  const marker = join(dir, 'executed.txt');
  const executed = await executeWithReceipt(execReceipt, callFile, [process.execPath, '-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, process.env.RULEOAK_DECISION_ID)`], dir, undefined, {
    secret,
    executor: 'cli-exec-test',
    now: '2026-01-01T00:01:30.000Z',
    stdio: 'ignore'
  });
  assert.equal(executed.executed, true);
  assert.equal(executed.status, 0);
  assert.equal(existsSync(marker), true);
  assert.equal(readFileSync(marker, 'utf8'), execResultSource.decision.receipt.decision_id);
  const replayExec = await executeWithReceipt(execReceipt, callFile, [process.execPath, '-e', 'process.exit(0)'], dir, undefined, {
    secret,
    executor: 'cli-exec-test',
    now: '2026-01-01T00:01:31.000Z',
    stdio: 'ignore'
  });
  assert.equal(replayExec.executed, false);
  assert.equal(replayExec.status, 5);

  const legacyPath = join(dir, 'legacy-policy.json');
  writeFileSync(legacyPath, JSON.stringify({
    defaultAction: 'needs_approval',
    blockedActions: ['filesystem.delete'],
    approvalRequired: ['shell.*'],
    allowedActions: ['filesystem.read']
  }, null, 2));
  const preview = migratePolicyFile(dir, legacyPath, { migratedAt: '2026-01-01T00:02:00.000Z' });
  assert.equal(preview.applied, false);
  assert.equal(preview.changed, true);
  assert.match(preview.previewText, /v1 -> v2/);
  const outputPath = join(dir, 'policy-v2.json');
  const output = migratePolicyFile(dir, legacyPath, { migratedAt: '2026-01-01T00:02:01.000Z', outPath: outputPath });
  assert.equal(output.applied, true);
  assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).policyVersion, 2);
  const inPlace = migratePolicyFile(dir, legacyPath, { migratedAt: '2026-01-01T00:02:02.000Z', write: true, yes: true });
  assert.equal(inPlace.applied, true);
  assert.equal(existsSync(inPlace.backupPath), true);
  assert.equal(JSON.parse(readFileSync(legacyPath, 'utf8')).policyVersion, 2);

  const provider = createFileQueueApprovalProvider(dir);
  assert.equal(validateApprovalProvider(provider).valid, true);

  console.log('cli integration reliability tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
