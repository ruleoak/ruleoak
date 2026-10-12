/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { runDemo } from './demo.mjs';
const result = await runDemo({ quiet: true });
assert.equal(result.deleteBlocked, true);
assert.equal(result.executed.some(value => value.startsWith('delete:')), false);
assert.equal(result.executed.filter(value => value.startsWith('install:')).length, 2);
assert.equal(result.approvals[1].reused, true);
console.log('coding agent shell guard example passed');
