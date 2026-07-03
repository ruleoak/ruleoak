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
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'packages/protocol/package.json',
  'packages/protocol/LICENSE',
  'packages/core/package.json',
  'packages/core/LICENSE',
  'packages/cli/package.json',
  'packages/cli/LICENSE',
  'packages/cli/bin/ruleoak.js',
  'docs/incident-report-format.md',
  'site/index.html'
];
for (const path of required) assert.equal(existsSync(path), true, `missing ${path}`);
assert.match(readFileSync('packages/protocol/LICENSE','utf8'), /MIT License/);
assert.match(readFileSync('packages/core/LICENSE','utf8'), /Apache License/);
assert.match(readFileSync('README.md','utf8'), /Agent Firewall \+ Flight Recorder/);
console.log('repository structure check passed');
