/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function compareText(a,b){const left=String(a),right=String(b);return left<right?-1:left>right?1:0;}
const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const workspaces = [...(pkg.workspaces || [])].sort(compareText);
if (!workspaces.length) {
  console.error('automatic QA: no workspaces declared');
  process.exit(1);
}
for (const workspace of workspaces) {
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/run_package_tests.mjs'), resolve(root, workspace)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, RULEOAK_AUTOMATIC_QA: '1' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`automatic QA: all ${workspaces.length} workspace test inventories passed`);
