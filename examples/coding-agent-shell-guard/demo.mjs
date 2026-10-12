/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRuleOak } from '../../packages/core/src/index.js';
import { generateHtmlTimelineReport, initProject, policyPath } from '../../packages/cli/src/cli.js';

export async function runDemo(options = {}) {
  const baseDir = resolve(options.baseDir || '.ruleoak-demo-output/coding-agent-shell-guard');
  rmSync(baseDir, { recursive: true, force: true });
  mkdirSync(baseDir, { recursive: true });
  initProject(baseDir, { policyPack: 'cautious' });
  writeFileSync(policyPath(baseDir), JSON.stringify({
    policyVersion: 2,
    defaultAction: 'deny',
    rules: [
      { id: 'deny-destructive-shell', effect: 'deny', priority: 300, actions: ['shell.delete'], resources: ['*'] },
      { id: 'approve-package-install', effect: 'needs_approval', priority: 200, actions: ['shell.package_install'], resources: ['*'] },
      { id: 'allow-safe-list', effect: 'allow', priority: 100, actions: ['shell.list'], resources: ['*'] }
    ]
  }, null, 2));

  const sessionGrants = new Set();
  const approvals = [];
  const approvalProvider = {
    apiVersion: '1.0',
    name: 'demo-session-approver',
    request(request) {
      const reused = sessionGrants.has(request.decision_key);
      sessionGrants.add(request.decision_key);
      approvals.push({ approval_id: request.approval_id, decision: 'allow_session', reused });
      return { decision: 'allow_session', reason: reused ? 'existing session grant reused by demo provider' : 'operator approved package installation for this session' };
    }
  };
  const ruleoak = await createRuleOak({
    workspace: resolve(baseDir, '.ruleoak'),
    approvalProvider,
    receiptMode: 'automatic'
  });

  const executed = [];
  const listWorkspace = ruleoak.guardFunction({
    name: 'shell.list', category: 'shell', operation: 'read', resource: './workspace',
    mapArguments: ([path]) => ({ command: 'list', path }),
    execute: async path => { executed.push(`list:${path}`); return ['README.md', 'package.json']; }
  });
  const installPackage = ruleoak.guardFunction({
    name: 'shell.package_install', category: 'shell', operation: 'execute', resource: 'npm:example-package',
    mapArguments: ([name]) => ({ command: 'npm install', package: name, simulated: true }),
    execute: async name => { executed.push(`install:${name}`); return { installed: name, simulated: true }; }
  });
  const destructiveDelete = ruleoak.guardFunction({
    name: 'shell.delete', category: 'shell', operation: 'delete', resource: './workspace',
    mapArguments: ([path]) => ({ command: 'rm -rf', path, simulated: true }),
    execute: async path => { executed.push(`delete:${path}`); return { deleted: path }; }
  });

  const listed = await listWorkspace('./workspace');
  const firstInstall = await installPackage('example-package');
  const secondInstall = await installPackage('example-package');
  let deleteBlocked = false;
  try { await destructiveDelete('./workspace'); }
  catch (error) { deleteBlocked = error.code === 'RULEOAK_DENIED'; }
  const report = generateHtmlTimelineReport(baseDir, resolve(baseDir, '.ruleoak/report.html'));
  const result = { baseDir, listed, firstInstall, secondInstall, approvals, executed, deleteBlocked, report };
  if (!options.quiet) {
    console.log('RuleOak coding-agent shell guard');
    console.log(`Safe list: allowed (${listed.length} simulated entries)`);
    console.log(`Package install: approved for session (${approvals.length} approval-provider decisions)`);
    console.log(`Destructive command: ${deleteBlocked ? 'denied before execution' : 'unexpectedly allowed'}`);
    console.log(`Executed mocks: ${executed.join(', ')}`);
    console.log(`Evidence report: ${report}`);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await runDemo();
