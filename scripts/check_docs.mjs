/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'docs/architecture/OVERVIEW.md',
  'docs/architecture/ACTION_CONTROL_PLANE.md',
  'docs/concepts/AUTHORITY_ENVELOPE.md',
  'docs/concepts/APPROVAL_CONTRACT.md',
  'docs/concepts/EXECUTION_LEASE.md',
  'docs/concepts/EFFECT_RECEIPT.md',
  'docs/concepts/INSPECTOR.md',
  'docs/concepts/CAPABILITY_IDENTITY_EVIDENCE.md',
  'docs/concepts/CAPABILITY_HISTORY.md',
  'docs/concepts/CRASHLAB.md',
  'docs/security/BOUNDARY.md',
  'docs/protocols/MCP.md',
  'docs/project/VERSIONING.md',
  'docs/project/LICENSING.md',
  'docs/project/PUBLIC_PRODUCT_TRUTH.md',
  'docs/project/PUBLIC_REPOSITORY_SCOPE.md',
  'docs/guides/FLIGHT_CONTROL_QUICKSTART.md',
  'docs/guides/INSPECT_MCP_SERVER.md',
  'docs/guides/CRASHLAB_QUICKSTART.md',
  'docs/guides/VSCODE_INSPECTOR.md',
  'docs/guides/MCP_REGISTRY_INGESTION.md',
  'docs/dev-quickstart.md',
  'docs/community-roadmap.md',
  'docs/public-release-checklist.md'
];
for (const path of required) assert.equal(existsSync(path), true, `missing ${path}`);

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const truth = readFileSync('docs/project/PUBLIC_PRODUCT_TRUTH.md', 'utf8');
assert.match(truth, new RegExp(`v${version.replace(/\\./g, '\\\\.')}`));
assert.match(truth, /Inspector/i);
assert.match(truth, /Flight Control/i);
assert.match(truth, /Flight Recorder/i);
assert.match(truth, /CrashLab/i);
assert.match(truth, /does not silently create persistent policy authority/i);
console.log(`documentation truth check passed for v${version}`);
