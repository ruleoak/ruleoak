/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = resolve(new URL('../../..', import.meta.url).pathname);
const cli = resolve(repo, 'packages/cli/bin/ruleoak.js');
const example = resolve(repo, 'examples/intent-ir/radio-playback.intent.json');
const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8' });

const valid = run(['intent', 'validate', example]);
assert.equal(valid.status, 0, valid.stderr || valid.stdout);
assert.match(valid.stdout, /Validation: PASS/);

const validJson = run(['intent', 'validate', '--file', example, '--json']);
assert.equal(validJson.status, 0, validJson.stderr || validJson.stdout);
const parsedValidation = JSON.parse(validJson.stdout);
assert.equal(parsedValidation.valid, true);
assert.equal(parsedValidation.summary.counts.capabilities, 2);

const shown = run(['intent', 'show', example]);
assert.equal(shown.status, 0, shown.stderr || shown.stdout);
assert.match(shown.stdout, /RuleOak Intent IR v0\.1/);
assert.match(shown.stdout, /capabilities=2/);

const canonicalA = run(['intent', 'show', example, '--canonical']);
const canonicalB = run(['intent', 'show', example, '--canonical']);
assert.equal(canonicalA.status, 0, canonicalA.stderr || canonicalA.stdout);
assert.equal(canonicalA.stdout, canonicalB.stdout);
assert.equal(canonicalA.stdout.trim().startsWith('{'), true);

const temp = mkdtempSync(join(tmpdir(), 'ruleoak-intent-intent-ir-'));
const invalidPath = join(temp, 'invalid.intent.json');
const invalid = JSON.parse(readFileSync(example, 'utf8'));
invalid.capabilities[0].invariant_ids.push('inv.unknown');
writeFileSync(invalidPath, JSON.stringify(invalid, null, 2));
const invalidRun = run(['intent', 'validate', invalidPath]);
assert.equal(invalidRun.status, 1);
assert.match(invalidRun.stdout, /Validation: FAIL/);
assert.match(invalidRun.stdout, /references unknown id/);

const malformedPath = join(temp, 'malformed.json');
writeFileSync(malformedPath, '{ nope');
const malformed = run(['intent', 'validate', malformedPath]);
assert.equal(malformed.status, 1);
assert.match(malformed.stderr, /unable to read Intent manifest/);

console.log('Intent IR v0.1 CLI tests passed');
