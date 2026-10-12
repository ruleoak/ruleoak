/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const schema = JSON.parse(readFileSync(new URL('../schemas/repository-understanding-v0.1.schema.json', import.meta.url), 'utf8'));
assert.equal(schema.properties.understanding_version.const, '0.1');
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.$defs.provenance.properties.class.enum, ['OBSERVED','DECLARED','INFERRED']);
assert.equal(schema.$defs.unknown.properties.status.const, 'UNKNOWN');
console.log('Repository Understanding v0.1 schema tests passed');
