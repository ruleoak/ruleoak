/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
assert.equal(process.env.RULEOAK_AUTOMATIC_QA,'1','nested discovery sentinel must be executed by the automatic package test runner');
console.log('Automatic QA nested-test discovery sentinel passed');
