/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAdoptionSnapshot, writeAdoptionSnapshot } from '../src/adoption-evidence.js';

const root = mkdtempSync(join(tmpdir(), 'ruleoak-adoption-snapshot-secret-project-name-'));
const fixed = '2026-09-06T00:00:00.000Z';
const snapshot = buildAdoptionSnapshot(root, { version: '0.50.0', generatedAt: fixed });
assert.equal(snapshot.activation.stage, 'SETUP_REQUIRED');
assert.equal(snapshot.external_adoption_proven, false);
assert.equal(snapshot.privacy.project_path_included, false);
assert.equal(snapshot.privacy.raw_evidence_included, false);
assert.ok(snapshot.snapshot_digest.startsWith('sha256:'));
const serialized = JSON.stringify(snapshot);
assert.equal(serialized.includes(root), false, 'shareable snapshot must not leak project path');
assert.equal(serialized.includes('secret-project-name'), false, 'shareable snapshot must not leak project basename');

const out = join(root, 'snapshot.json');
const written = writeAdoptionSnapshot(root, out, { version: '0.50.0', generatedAt: fixed });
assert.equal(written.path, out);
assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), written.snapshot);
console.log('privacy-safe adoption evidence tests passed');
