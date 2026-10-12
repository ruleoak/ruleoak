/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initProject, replay, policyPath, evidencePath, pendingDir, approvalsDir, policySuggestionsDir, generateHtmlTimelineReport, runWrapped, checkCallFile, listPendingApprovals, decidePendingApproval, loadSessionDecisionCache, listPolicySuggestions, applyPolicySuggestion, listPolicyRules, listPolicyRuleHistory, changePolicyRuleStatus, demoPermissionManager, doctor, lintPolicyFile, writeDecisionReceipt, verifyReceiptFile } from '../src/cli.js';
import { EvidenceRecorder } from '@ruleoak/core';

async function expectRejectsWithoutConsoleNoise(fn, expected) {
  const originalError = console.error;
  const messages = [];
  console.error = (...args) => { messages.push(args.join(' ')); };
  try {
    await assert.rejects(fn, expected);
  } finally {
    console.error = originalError;
  }
  assert.match(messages.join('\n'), /CRITICAL CONFIGURATION ERROR/);
}

const dir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-'));
try {
  initProject(dir);
  assert.equal(existsSync(policyPath(dir)), true);
  if (process.platform !== 'win32') {
    assert.equal(statSync(join(dir, '.ruleoak')).mode & 0o777, 0o700);
    assert.equal(statSync(policyPath(dir)).mode & 0o777, 0o600);
  }
  const initialLint = lintPolicyFile(dir);
  assert.equal(initialLint.valid, true);
  const initialDoctor = doctor(dir);
  assert.equal(initialDoctor.ok, true);
  const recorder = new EvidenceRecorder(evidencePath(dir));
  recorder.append({ type: 'filesystem.read', target: './README.md' }, { action: 'allow', reason: 'test' }, '2026-01-01T00:00:00.000Z');
  const report = replay(dir, true);
  assert.match(report, /Hash chain: intact/);
  assert.match(report, /filesystem.read/);
  const html = generateHtmlTimelineReport(dir, join(dir, '.ruleoak/report.html'));
  assert.equal(existsSync(html), true);
  const initialHtml = readFileSync(html, 'utf8');
  assert.match(initialHtml, /RuleOak Local Audit Viewer/);
  assert.match(initialHtml, /Pending approvals/);
  assert.match(initialHtml, /Session cache entries/);
  assert.match(initialHtml, /Evidence graph/);

  const callFile = join(dir, 'private-read.json');
  writeFileSync(callFile, JSON.stringify({
    type: 'filesystem.read',
    target: '~/Private/note.txt',
    arguments: { path: '~/Private/note.txt' },
    metadata: { sensitivity: 'private' }
  }, null, 2));
  const checkResult = checkCallFile(callFile, dir, undefined, '2026-01-01T00:00:00.000Z');
  assert.equal(checkResult.classification.risk, 'medium');
  assert.equal(checkResult.decision.action, 'needs_approval');
  assert.ok(checkResult.approval.record.approval_id.startsWith('appr_'));
  assert.equal(existsSync(pendingDir(dir)), true);
  assert.equal(listPendingApprovals(dir).length, 1);
  assert.match(readFileSync(evidencePath(dir), 'utf8'), /filesystem.read/);
  const receiptFile = join(dir, 'decision-receipt.json');
  writeDecisionReceipt(checkResult, receiptFile);
  assert.equal(existsSync(receiptFile), true);
  const receiptVerification = verifyReceiptFile(receiptFile, callFile, dir, undefined, { requireAllow: false, now: '2026-01-01T00:00:30.000Z' });
  assert.equal(receiptVerification.ok, true);
  const exitCodeDir = mkdtempSync(join(tmpdir(), 'ruleoak-cli-exit-'));
  try {
    initProject(exitCodeDir);
    const deniedCli = spawnSync(process.execPath, [join(process.cwd(), 'bin/ruleoak.js'), 'check', '--call', join(process.cwd(), '../../examples/calls/delete-protected.json'), '--dir', exitCodeDir, '--json'], { encoding: 'utf8' });
    assert.equal(deniedCli.status, 2);
    const pendingCli = spawnSync(process.execPath, [join(process.cwd(), 'bin/ruleoak.js'), 'check', '--call', callFile, '--dir', exitCodeDir, '--json'], { encoding: 'utf8' });
    assert.equal(pendingCli.status, 3);
  } finally {
    rmSync(exitCodeDir, { recursive: true, force: true });
  }

  const approvalId = checkResult.approval.record.approval_id;
  const decided = decidePendingApproval(dir, approvalId, 'allow_session', '2026-01-01T00:00:01.000Z');
  assert.equal(decided.record.final_decision.action, 'allow');
  assert.equal(existsSync(approvalsDir(dir)), true);
  assert.equal(listPendingApprovals(dir).length, 0);
  assert.equal(Object.keys(loadSessionDecisionCache(dir, 'sess_default')).length, 0);
  const sessionCache = loadSessionDecisionCache(dir, checkResult.normalizedCall.actor.session_id);
  assert.equal(Object.values(sessionCache)[0].decision, 'allow_session');

  const cachedCheck = checkCallFile(callFile, dir, undefined, '2026-01-01T00:00:02.000Z');
  assert.equal(cachedCheck.decision.action, 'allow');
  assert.equal(cachedCheck.approval, null);
  const emailFile = join(dir, 'email-send.json');
  writeFileSync(emailFile, JSON.stringify({
    type: 'email.send',
    target: 'friend@example.com',
    arguments: { to: 'friend@example.com', subject: 'Hello', body: 'No secrets here' },
    metadata: { sensitivity: 'internal', sessionId: 'sess_policy_suggestion' }
  }, null, 2));
  const emailCheck = checkCallFile(emailFile, dir, undefined, '2026-01-01T00:00:03.000Z');
  assert.equal(emailCheck.decision.action, 'needs_approval');
  const suggestionDecision = decidePendingApproval(dir, emailCheck.approval.record.approval_id, 'always_block', '2026-01-01T00:00:04.000Z');
  assert.equal(suggestionDecision.record.final_decision.action, 'deny');
  assert.equal(existsSync(policySuggestionsDir(dir)), true);
  assert.equal(existsSync(suggestionDecision.policySuggestionPath), true);
  assert.match(readFileSync(suggestionDecision.policySuggestionPath, 'utf8'), /not_applied/);
  assert.equal(listPolicySuggestions(dir).length, 1);

  const previewApply = applyPolicySuggestion(dir, suggestionDecision.policySuggestion.suggestion_id, { timestamp: '2026-01-01T00:00:05.000Z' });
  assert.equal(previewApply.applied, false);
  assert.match(previewApply.previewText, /RuleOak policy suggestion preview/);
  assert.match(readFileSync(policyPath(dir), 'utf8'), /"rules"/);
  assert.doesNotMatch(readFileSync(policyPath(dir), 'utf8'), /"exactActionRules"/);

  const appliedSuggestion = applyPolicySuggestion(dir, suggestionDecision.policySuggestion.suggestion_id, { yes: true, timestamp: '2026-01-01T00:00:06.000Z' });
  assert.equal(appliedSuggestion.applied, true);
  assert.equal(appliedSuggestion.rule.effect, 'block');
  assert.match(readFileSync(policyPath(dir), 'utf8'), /"exactActionRules"/);
  assert.match(readFileSync(suggestionDecision.policySuggestionPath, 'utf8'), /"status": "applied"/);

  const afterApply = checkCallFile(emailFile, dir, undefined, '2026-01-01T00:00:07.000Z');
  assert.equal(afterApply.decision.action, 'deny');
  assert.equal(afterApply.approval, null);
  assert.match(afterApply.decision.matchedRule, /exactActionRules/);
  assert.equal(listPolicyRules(dir).length, 1);
  assert.equal(listPolicyRules(dir)[0].status, 'enabled');

  const disablePreview = changePolicyRuleStatus(dir, appliedSuggestion.rule.id, 'disable', { timestamp: '2026-01-01T00:00:08.000Z' });
  assert.equal(disablePreview.applied, false);
  assert.match(disablePreview.previewText, /policy rule disable preview/);
  assert.equal(listPolicyRules(dir)[0].status, 'enabled');

  const disabledRule = changePolicyRuleStatus(dir, appliedSuggestion.rule.id, 'disable', { yes: true, timestamp: '2026-01-01T00:00:09.000Z', reason: 'test rollback' });
  assert.equal(disabledRule.applied, true);
  assert.equal(disabledRule.nextRule.disabled, true);
  assert.equal(listPolicyRules(dir)[0].status, 'disabled');
  assert.equal(listPolicyRuleHistory(dir).length, 1);
  assert.match(readFileSync(disabledRule.historyPath, 'utf8'), /disable_exact_action_rule/);

  const afterDisable = checkCallFile(emailFile, dir, undefined, '2026-01-01T00:00:10.000Z');
  assert.equal(afterDisable.decision.action, 'needs_approval');
  assert.ok(afterDisable.approval.record.approval_id.startsWith('appr_'));

  const enabledRule = changePolicyRuleStatus(dir, appliedSuggestion.rule.id, 'enable', { yes: true, timestamp: '2026-01-01T00:00:11.000Z' });
  assert.equal(enabledRule.applied, true);
  assert.equal(listPolicyRules(dir)[0].status, 'enabled');
  assert.equal(listPolicyRuleHistory(dir).length, 2);
  const afterEnable = checkCallFile(emailFile, dir, undefined, '2026-01-01T00:00:12.000Z');
  assert.equal(afterEnable.decision.action, 'deny');
  assert.equal(afterEnable.approval, null);

  const approvalHtml = generateHtmlTimelineReport(dir, join(dir, '.ruleoak/approval-report.html'));
  const approvalHtmlText = readFileSync(approvalHtml, 'utf8');
  assert.match(approvalHtmlText, /Approval lifecycle/);
  assert.match(approvalHtmlText, /Decided approvals/);
  assert.match(approvalHtmlText, /Session cache entries/);
  assert.match(approvalHtmlText, /Policy suggestions/);
  assert.match(approvalHtmlText, /Exact action policy rules/);
  assert.match(approvalHtmlText, /Policy rule history/);
  assert.match(approvalHtmlText, /always_block/);
  assert.match(approvalHtmlText, /allow_session/);

  const badPolicy = join(dir, 'bad-policy.json');
  writeFileSync(badPolicy, JSON.stringify({ defaultAction: 'explode' }));
  await expectRejectsWithoutConsoleNoise(() => runWrapped(['node', '-e', 'console.log("should not run")'], dir, { policyPath: badPolicy }), /policy validation failed/);

  const originalLog = console.log;
  console.log = () => {};
  let demo;
  try { demo = await demoPermissionManager(); }
  finally { console.log = originalLog; }
  assert.equal(existsSync(evidencePath(demo.project)), true);
  assert.equal(demo.rows.length, 7);
  assert.ok(listPendingApprovals(demo.project).length >= 1);
  rmSync(demo.project, { recursive: true, force: true });

  console.log('cli tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
