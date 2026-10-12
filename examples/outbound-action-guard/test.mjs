/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { runDemo } from './demo.mjs';
const result = await runDemo({ quiet: true });
assert.equal(result.internal.accepted, true);
assert.equal(result.external.accepted, true);
assert.equal(result.approvals.length, 1);
assert.equal(result.secretBlocked, true);
assert.equal(result.delivered.length, 2);
assert.equal(existsSync(result.bundle.outPath), true);
console.log('outbound action guard example passed');
