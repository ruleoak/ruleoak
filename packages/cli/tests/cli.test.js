/*
 * Copyright © 2026 The RuleOak Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-FileCopyrightText: 2026 The RuleOak Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initProject, replay, policyPath, evidencePath, generateHtmlTimelineReport, runWrapped } from '../src/cli.js';
import { EvidenceRecorder } from '@ruleoak/core';

async function expectRejectsWithoutConsoleNoise(fn, expected) {
  const originalError = console.error;
  const messages = [];
  console.error = (...args) => { messages.push(args.join(' ')); };
  try {
    await assert.rejects(fn, expected);
  } finally {
    console.error = originalError;
  }
  assert.match(messages.join('\n'), /CRITICAL CONFIGURATION ERROR/);
}

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-'));
try {
  initProject(dir);
  assert.equal(existsSync(policyPath(dir)), true);
  const recorder = new EvidenceRecorder(evidencePath(dir));
  recorder.append({ type: 'filesystem.read', target: './README.md' }, { action: 'allow', reason: 'test' }, '2026-01-01T00:00:00.000Z');
  const report = replay(dir, true);
  assert.match(report, /Hash chain: intact/);
  assert.match(report, /filesystem.read/);
  const html = generateHtmlTimelineReport(dir, join(dir, '.ruleoak/report.html'));
  assert.equal(existsSync(html), true);
  assert.match(readFileSync(html, 'utf8'), /RuleOak Flight Recorder Timeline/);

  const badPolicy = join(dir, 'bad-policy.json');
  writeFileSync(badPolicy, JSON.stringify({ defaultAction: 'explode' }));
  await expectRejectsWithoutConsoleNoise(() => runWrapped(['node', '-e', 'console.log("should not run")'], dir, { policyPath: badPolicy }), /policy validation failed/);

  console.log('cli tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
