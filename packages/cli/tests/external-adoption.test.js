/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeAdoptionWorkspace, onboard } from '../src/cli.js';

const root = mkdtempSync(join(tmpdir(), 'ruleoak-adoption-'));
writeFileSync(join(root, 'package.json'), '{"name":"fixture"}\n');
writeFileSync(join(root, '.mcp.json'), '{"mcpServers":{"private":{"env":{"TOKEN":"secret-never-read"}}}}\n');
mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
const profile = analyzeAdoptionWorkspace(root);
assert.equal(profile.integration, 'mcp');
assert.equal(profile.recommended_policy_pack, 'mcp-server-safe');
assert.equal(profile.initialized, false);
assert.deepEqual(profile.privacy, { contents_read: false, source_code_read: false, prompts_read: false, credentials_read: false });
assert.ok(profile.detected.mcp_config_paths.includes('.mcp.json'));
assert.ok(profile.next_steps.includes('ruleoak onboard --init'));

const preview = onboard(root);
assert.equal(preview.initialized, false);
assert.equal(preview.health, null);
assert.equal(preview.activation.stage, 'SETUP_REQUIRED');
const initialized = onboard(root, { init: true });
assert.equal(initialized.initialized, true);
assert.equal(initialized.profile.initialized, true);
assert.ok(initialized.health);
assert.equal(initialized.health.ok, true);
assert.equal(initialized.activation.stage, 'PROTECTION_NOT_ACTIVE');
console.log('external adoption tests passed');
