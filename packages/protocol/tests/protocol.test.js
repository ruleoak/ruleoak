/*
 * Copyright © 2026 Sun Shaobin.
 * SPDX-FileCopyrightText: 2026 Sun Shaobin
 * SPDX-License-Identifier: MIT
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateActionEnvelope, validatePolicy } from '../src/index.js';

const policy = JSON.parse(readFileSync(new URL('../fixtures/policies/default-policy.json', import.meta.url)));
assert.equal(validatePolicy(policy).valid, true);
assert.equal(validateActionEnvelope({ type: 'filesystem.read', target: './README.md' }).valid, true);
assert.equal(validateActionEnvelope({ target: './README.md' }).valid, false);
console.log('protocol tests passed');
