/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('SOURCE_MANIFEST.sha256');
if (!existsSync(manifestPath)) throw new Error('SOURCE_MANIFEST.sha256 is missing');
const rows = readFileSync(manifestPath, 'utf8').split(/\r?\n/).filter(Boolean);
const seen = new Set();
for (const row of rows) {
  const match = row.match(/^(0[0-7]{3}) ([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`invalid SOURCE_MANIFEST row: ${row}`);
  const [, expectedMode, expectedHash, rel] = match;
  if (seen.has(rel)) throw new Error(`duplicate SOURCE_MANIFEST path: ${rel}`);
  seen.add(rel);
  if (rel === 'SOURCE_MANIFEST.sha256' || rel.startsWith('/') || rel.includes('..')) throw new Error(`unsafe SOURCE_MANIFEST path: ${rel}`);
  const path = resolve(rel);
  const st = lstatSync(path);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error(`SOURCE_MANIFEST path must be a regular file: ${rel}`);
  const actualMode = `0${(st.mode & 0o777).toString(8)}`;
  const actualHash = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actualMode !== expectedMode) throw new Error(`SOURCE_MANIFEST mode mismatch ${rel}: ${actualMode} != ${expectedMode}`);
  if (actualHash !== expectedHash) throw new Error(`SOURCE_MANIFEST hash mismatch ${rel}`);
}
console.log(`SOURCE_MANIFEST_PASS ${rows.length}/${rows.length}`);
