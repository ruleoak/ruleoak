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
import { RuleOakEngine } from '../src/engine/evaluator.js';

const performancePolicy = {
  blockedActions: ['filesystem.delete.*', 'network.egress.sensitive.*', 'shell.raw.exec'],
  allowedActions: ['filesystem.read.*', 'metrics.*', 'mcp.tools.*'],
  approvalRequired: ['filesystem.write.protected', 'network.connect.*'],
  defaultAction: 'block'
};

const engine = new RuleOakEngine(performancePolicy);
const iterations = 5000;
const executionTimes = [];
const samples = [
  'filesystem.delete.var.log.syslog',
  'filesystem.read.workspace.package',
  'network.connect.api.example',
  'metrics.latency.p99',
  'mcp.tools.list',
  'unknown.action'
];

for (let i = 0; i < iterations; i++) {
  const action = { type: samples[i % samples.length], arguments: { secure: true, i } };
  const start = process.hrtime.bigint();
  engine.evaluate(action);
  const end = process.hrtime.bigint();
  executionTimes.push(end - start);
}

const timesInMs = executionTimes.map(ns => Number(ns) / 1_000_000).sort((a, b) => a - b);
const percentile99 = timesInMs[Math.floor(iterations * 0.99)];
console.log(`RuleOak 99th Percentile Policy Latency: ${percentile99.toFixed(4)} ms`);
assert.ok(percentile99 < 5.0, `expected p99 < 5ms, got ${percentile99}`);
console.log('core performance tests passed');
