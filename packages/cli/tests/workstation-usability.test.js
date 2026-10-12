/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  approvalsDir,
  authorPolicyRule,
  checkCallFile,
  checkpointsDir,
  createApprovalInbox,
  createAuditCheckpoint,
  createEvidenceBundle,
  initProject,
  pendingDir,
  policyPath,
  upgradeWorkspace,
  verifyAuditCheckpoint,
  workspaceMetadataPath,
  workspaceStatus
} from '../src/cli.js';
import { verifyEvidenceBundleFile } from '../src/workstation.js';

const cliPackageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-workstation-'));
try {
  const initialized = initProject(dir, { policyPack: 'cautious' });
  assert.equal(existsSync(initialized.policyPath), true);
  assert.equal(existsSync(checkpointsDir(dir)), true);
  assert.equal(JSON.parse(readFileSync(workspaceMetadataPath(dir), 'utf8')).ruleoak_version, cliPackageVersion);

  const policy = JSON.parse(readFileSync(policyPath(dir), 'utf8'));
  policy.rules.push({ id: 'review-private', effect: 'needs_approval', priority: 200, actions: ['filesystem.read'], conditions: { sensitivities: ['private'] } });
  writeFileSync(policyPath(dir), JSON.stringify(policy, null, 2) + '\n');
  const callFile = join(dir, 'private-read.json');
  writeFileSync(callFile, JSON.stringify({
    call_id: 'call_v080_inbox',
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: { type: 'agent', name: 'v080-test', session_id: 'sess_v080' },
    tool: { name: 'filesystem.read', category: 'file', operation: 'read' },
    target: { resource: './private/note.txt', scope: 'local', sensitivity: 'private' },
    arguments: { path: './private/note.txt' },
    context: {}
  }, null, 2));
  const checked = checkCallFile(callFile, dir, undefined, '2026-01-01T00:00:00.000Z');
  assert.equal(checked.decision.action, 'needs_approval');
  assert.equal(existsSync(pendingDir(dir)), true);
  const inbox = createApprovalInbox(dir, join(dir, 'approval-inbox.html'));
  assert.equal(inbox.pending.length, 1);
  assert.match(readFileSync(inbox.outPath, 'utf8'), new RegExp(checked.approval.record.approval_id));
  assert.match(readFileSync(inbox.outPath, 'utf8'), /Read-only local view/);

  const authoredPreview = authorPolicyRule(dir, {
    id: 'allow-safe-status',
    effect: 'allow',
    actions: ['system.status'],
    resources: ['local'],
    riskAtMost: 'low'
  });
  assert.equal(authoredPreview.applied, false);
  assert.match(authoredPreview.previewText, /No file is changed/);
  const authored = authorPolicyRule(dir, {
    id: 'allow-safe-status',
    effect: 'allow',
    actions: ['system.status'],
    resources: ['local'],
    riskAtMost: 'low',
    yes: true
  });
  assert.equal(authored.applied, true);
  assert.equal(JSON.parse(readFileSync(policyPath(dir), 'utf8')).rules.some(rule => rule.id === 'allow-safe-status'), true);

  const secret = 'v080-checkpoint-secret';
  const checkpoint = createAuditCheckpoint(dir, { secret, createdAt: '2026-01-01T00:01:00.000Z' });
  assert.equal(existsSync(checkpoint.outPath), true);
  const checkpointVerification = verifyAuditCheckpoint(checkpoint.outPath, dir, { secret, requireSignature: true });
  assert.equal(checkpointVerification.ok, true, checkpointVerification.errors.join('; '));

  const bundlePath = join(dir, 'ruleoak-evidence.zip');
  const bundle = createEvidenceBundle(dir, bundlePath, { secret, createdAt: '2026-01-01T00:02:00.000Z' });
  assert.equal(bundle.manifest.bundle_version, '3.0');
  assert.equal(bundle.manifest.privacy_profile, 'minimal');
  const bundleVerification = verifyEvidenceBundleFile(bundlePath, { secret, requireSignature: true });
  assert.equal(bundleVerification.ok, true, bundleVerification.errors.join('; '));

  const legacyDir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-v080-upgrade-'));
  try {
    mkdirSync(join(legacyDir, '.ruleoak'), { recursive: true });
    writeFileSync(join(legacyDir, '.ruleoak', 'policy.json'), JSON.stringify({
      defaultAction: 'needs_approval',
      allowedActions: ['filesystem.read'],
      blockedActions: ['filesystem.delete'],
      approvalRequired: ['*']
    }, null, 2));
    const before = workspaceStatus(legacyDir);
    assert.equal(before.upgrade_recommended, true);
    const preview = upgradeWorkspace(legacyDir);
    assert.equal(preview.applied, false);
    const upgraded = upgradeWorkspace(legacyDir, { yes: true, updatedAt: '2026-01-01T00:03:00.000Z' });
    assert.equal(upgraded.applied, true);
    assert.equal(existsSync(upgraded.backupPath), true);
    assert.equal(JSON.parse(readFileSync(join(legacyDir, '.ruleoak', 'policy.json'), 'utf8')).policyVersion, 2);
    assert.equal(workspaceStatus(legacyDir).upgrade_recommended, false);
  } finally {
    rmSync(legacyDir, { recursive: true, force: true });
  }

  assert.equal(existsSync(approvalsDir(dir)), true);
  console.log('cli workstation usability tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
