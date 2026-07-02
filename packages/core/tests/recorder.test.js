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
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvidenceRecorder, verifyEvidence } from '../src/protocol/recorder.js';

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-recorder-'));
try {
  const recorder = new EvidenceRecorder(join(dir, 'evidence.jsonl'));
  recorder.append({ type: 'filesystem.read', target: './README.md' }, { action: 'allow', reason: 'test' }, '2026-01-01T00:00:00.000Z');
  recorder.append({ type: 'filesystem.delete', target: '../secret.env' }, { action: 'deny', reason: 'test' }, '2026-01-01T00:00:01.000Z');
  const events = recorder.readEvents();
  assert.equal(events.length, 2);
  assert.equal(verifyEvidence(events).ok, true);
  events[0].decision.reason = 'tampered';
  assert.equal(verifyEvidence(events).ok, false);
  console.log('core recorder tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
