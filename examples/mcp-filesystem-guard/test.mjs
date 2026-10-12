/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { runDemo } from './demo.mjs';
const result = await runDemo({ quiet: true });
assert.equal(result.stdioForwarded.includes('"id":1'), true);
assert.equal(result.stdioForwarded.includes('"id":2'), true);
assert.equal(result.stdioForwarded.includes('"id":3'), false);
assert.equal(result.publicResponse.result.forwarded, true);
assert.equal(result.privateResponse.error.code, -32002);
assert.ok(result.privateResponse.error.data.approvalId);
assert.equal(result.deleteResponse.error.code, -32001);
assert.equal(result.decided.final_decision.action, 'allow');
console.log('MCP filesystem guard example passed');
