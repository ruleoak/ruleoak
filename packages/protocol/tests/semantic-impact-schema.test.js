/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const schema=JSON.parse(readFileSync(new URL('../schemas/semantic-impact-v0.1.schema.json',import.meta.url),'utf8'));
assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties.impact_version.const,'0.1');
assert.equal(schema.properties.request.properties.matcher.const,'deterministic-lexical-v0.1');
assert.deepEqual(schema.properties.risk.properties.level.enum,['LOW','MEDIUM','HIGH','CRITICAL','UNKNOWN']);
assert.ok(schema.required.includes('impact_graph'));
console.log('Semantic Impact schema tests passed');
