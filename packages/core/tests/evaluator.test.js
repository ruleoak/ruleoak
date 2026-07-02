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
import { evaluatePolicy, RuleOakEngine, RuleOakPolicyValidationError } from '../src/engine/evaluator.js';

const policy = {
  defaultAction: 'deny',
  allowedActions: ['filesystem.read', 'database.*'],
  approvalRequired: ['filesystem.*', 'database.mutate', '*'],
  blockedActions: ['shell.run', 'filesystem.delete']
};

assert.equal(evaluatePolicy({ type: 'filesystem.read' }, policy).action, 'allow');
assert.equal(evaluatePolicy({ type: 'filesystem.write' }, policy).action, 'needs_approval');
assert.equal(evaluatePolicy({ type: 'filesystem.delete' }, policy).action, 'deny');
assert.equal(evaluatePolicy({ type: 'shell.run' }, policy).action, 'deny');
assert.equal(evaluatePolicy({ type: 'database.read' }, policy).action, 'allow');
assert.equal(evaluatePolicy({ type: 'database.mutate' }, policy).action, 'needs_approval');
assert.equal(evaluatePolicy({ type: 'unmatched.action' }, { defaultAction: 'deny' }).action, 'deny');
assert.equal(evaluatePolicy({ action: 'filesystem.read' }, policy).action, 'allow');
assert.equal(new RuleOakEngine({ defaultAction: 'block' }).evaluate({ type: 'unknown.action' }).action, 'deny');
assert.throws(() => new RuleOakEngine({ defaultAction: 'explode' }), RuleOakPolicyValidationError);
console.log('core evaluator tests passed');
