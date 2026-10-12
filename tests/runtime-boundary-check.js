/*
 * Copyright © 2026 RuleOak Pte. Ltd.
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
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'packages/cli/src/cli.js',
  'packages/cli/src/stream-gate.js',
  'packages/core/src/engine/evaluator.js',
  'packages/core/src/engine/policy-lint.js',
  'packages/core/src/decision/receipt.js',
  'packages/core/tests/maturity.test.js',
  'packages/core/tests/performance.test.js',
  'docs/html-timeline-report.md',
  'docs/security-boundary.md',
  'docs/decision-receipts.md',
  'docs/telemetry.md',
  'tests/fixtures/corrupted-policy.json'
];
for (const path of required) assert.equal(existsSync(path), true, `missing ${path}`);
const cli = readFileSync('packages/cli/src/cli.js', 'utf8');
const gate = readFileSync('packages/cli/src/stream-gate.js', 'utf8');
const evaluator = readFileSync('packages/core/src/engine/evaluator.js', 'utf8');
const receipt = readFileSync('packages/core/src/decision/receipt.js', 'utf8');
assert.match(cli, /executeStreamInterceptor/);
assert.match(cli, /checkCallFile/);
assert.match(cli, /demoPermissionManager/);
assert.match(cli, /lintPolicyFile/);
assert.match(cli, /doctor/);
assert.match(cli, /verifyReceiptFile/);
assert.match(gate, /RuleOakInboundGate/);
assert.match(gate, /evaluatePermissionRequest/);
assert.match(gate, /childStdin\.write/);
assert.match(gate, /tools\/call/);
assert.match(gate, /extractJsonFragments/);
assert.match(cli, /Telemetry/);
assert.doesNotMatch(cli, /NODE_OPTIONS/);
assert.doesNotMatch(cli, /child\.stdout.*jsonRpcActionFromLine|jsonRpcActionFromLine/);
const preload = readFileSync('packages/core/src/runtime/node-preload.js', 'utf8');
assert.match(preload, /Deprecated/);
assert.doesNotMatch(preload, /Phase/);
assert.match(evaluator, /RuleOakPolicyValidationError/);
assert.match(evaluator, /structuredDenies/);
assert.match(evaluator, /allowCritical/);
assert.match(receipt, /action_digest/);
assert.match(receipt, /policy_digest/);
assert.match(receipt, /timingSafeEqual/);
const htmlDoc = readFileSync('docs/html-timeline-report.md', 'utf8');
assert.match(htmlDoc, /no Tailwind CDN/i);
assert.match(htmlDoc, /HTML-escaped/i);
const boundary = readFileSync('docs/security-boundary.md', 'utf8');
assert.match(boundary, /client-to-server|client -> server|client → server/);
assert.match(boundary, /does not observe|does not prevent/i);
console.log('runtime boundary check passed');
