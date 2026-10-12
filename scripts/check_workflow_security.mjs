/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const workflowDir = '.github/workflows';
const files = readdirSync(workflowDir).filter(name => /\.ya?ml$/i.test(name)).sort();
let usesCount = 0;
for (const name of files) {
  const path = `${workflowDir}/${name}`;
  const text = readFileSync(path, 'utf8');
  assert.doesNotMatch(text, /\bpull_request_target\s*:/, `${path}: pull_request_target is not permitted`);
  assert.doesNotMatch(text, /\bpermissions\s*:\s*write-all\b/i, `${path}: write-all permissions are not permitted`);
  assert.doesNotMatch(text, /persist-credentials\s*:\s*true/i, `${path}: checkout credentials must not persist`);
  const pullRequestTriggered = /(^|\n)\s*pull_request\s*:/m.test(text);
  if (pullRequestTriggered) assert.doesNotMatch(text, /\bsecrets\.[A-Za-z0-9_]+/, `${path}: PR-triggered workflow must not reference repository secrets`);
  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
    usesCount += 1;
    const ref = match[1];
    if (ref.startsWith('./')) continue;
    assert.match(ref, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[0-9a-f]{40}$/, `${path}: action must be pinned to an immutable 40-hex commit: ${ref}`);
  }
}
assert.ok(usesCount >= 10, 'expected substantial GitHub Actions coverage');
console.log(`workflow security check passed: ${files.length} workflows, ${usesCount} immutable action references`);
