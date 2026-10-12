/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { RuleOakFlightRecorder } from '@ruleoak/core';
import { RuleOakInboundGate, denialResponse, isJsonRpcNotification } from '../src/stream-gate.js';

function sink() {
  return {
    value: '',
    ended: false,
    write(chunk) { this.value += String(chunk); return true; },
    end() { this.ended = true; }
  };
}

const fixtures = JSON.parse(readFileSync(resolve(process.cwd(), '../../examples/mcp-compatibility/fixtures.json'), 'utf8'));
assert.equal(fixtures.fixture_version, '1.0');
assert.equal(isJsonRpcNotification({ jsonrpc: '2.0', method: 'notifications/initialized' }), true);
assert.equal(denialResponse({ jsonrpc: '2.0', method: 'tools/call' }, { action: 'deny', reason: 'test' }), null);

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-mcp-fixtures-'));
try {
  const child = sink();
  const stdout = sink();
  const stderr = sink();
  const policy = {
    policyVersion: 2,
    defaultAction: 'needs_approval',
    rules: [
      { id: 'deny-delete', effect: 'deny', priority: 100, actions: ['mcp.filesystem.delete'] },
      { id: 'allow-public-read', effect: 'allow', priority: 50, actions: ['mcp.filesystem.read'], resources: ['./public/**'], riskAtMost: 'low' }
    ]
  };
  const gate = new RuleOakInboundGate({
    policy,
    recorder: new RuleOakFlightRecorder(join(dir, 'evidence.jsonl')),
    fixedTimestamp: '2026-01-01T00:00:00.000Z',
    childStdin: child,
    stdout,
    stderr
  });

  for (const fixture of fixtures.cases) await gate.write(`${JSON.stringify(fixture.input)}\n`);
  await gate.end();

  assert.match(child.value, /"method":"initialize"/);
  assert.match(child.value, /notifications\/initialized/);
  assert.match(child.value, /filesystem\.read/);
  assert.doesNotMatch(child.value, /filesystem\.delete/);
  const responses = stdout.value.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  assert.equal(responses.length, 1);
  assert.equal(responses[0].id, 3);
  assert.equal(responses[0].error.code, -32001);
  assert.match(stderr.value, /notifications do not receive responses/);

  const batchChild = sink();
  const batchOut = sink();
  const batchGate = new RuleOakInboundGate({
    policy,
    recorder: new RuleOakFlightRecorder(join(dir, 'batch-evidence.jsonl')),
    fixedTimestamp: '2026-01-01T00:00:01.000Z',
    childStdin: batchChild,
    stdout: batchOut,
    stderr: sink()
  });
  const batch = [
    fixtures.cases[0].input,
    fixtures.cases[2].input,
    fixtures.cases[3].input,
    fixtures.cases[4].input
  ];
  await batchGate.write(`${JSON.stringify(batch)}\n`);
  await batchGate.end();
  const forwardedBatch = JSON.parse(batchChild.value.trim());
  assert.equal(forwardedBatch.length, 2);
  assert.equal(forwardedBatch.some(item => item.method === 'tools/call' && item.params.name === 'filesystem.delete'), false);
  const deniedBatch = JSON.parse(batchOut.value.trim());
  assert.equal(Array.isArray(deniedBatch), true);
  assert.equal(deniedBatch.length, 1);
  assert.equal(deniedBatch[0].id, 3);

  console.log('mcp compatibility tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
