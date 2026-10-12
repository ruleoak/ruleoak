/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRuleOak } from '../../packages/core/src/index.js';
import { createEvidenceBundle, initProject, policyPath } from '../../packages/cli/src/cli.js';

export async function runDemo(options = {}) {
  const baseDir = resolve(options.baseDir || '.ruleoak-demo-output/outbound-action-guard');
  rmSync(baseDir, { recursive: true, force: true });
  mkdirSync(baseDir, { recursive: true });
  initProject(baseDir, { policyPack: 'cautious' });
  writeFileSync(policyPath(baseDir), JSON.stringify({
    policyVersion: 2,
    defaultAction: 'deny',
    rules: [
      { id: 'allow-internal-mail', effect: 'allow', priority: 200, actions: ['email.send'], resources: ['*@internal.example'] },
      { id: 'approve-external-mail', effect: 'needs_approval', priority: 100, actions: ['email.send'], resources: ['*'] }
    ]
  }, null, 2));

  const approvals = [];
  const approvalProvider = {
    apiVersion: '1.0',
    name: 'demo-outbound-approver',
    request(request) {
      approvals.push(request.approval_id);
      return { decision: 'allow_once', reason: 'operator approved external destination for this simulated send' };
    }
  };
  const ruleoak = await createRuleOak({
    workspace: resolve(baseDir, '.ruleoak'),
    approvalProvider,
    receiptMode: 'automatic'
  });

  const delivered = [];
  const send = destination => ruleoak.guardFunction({
    name: 'email.send', category: 'email', operation: 'send', resource: destination,
    mapArguments: ([payload]) => ({ to: destination, ...payload, simulated: true }),
    execute: async payload => {
      delivered.push({ destination, subject: payload.subject });
      return { accepted: true, destination, simulated: true };
    }
  });

  const internal = await send('ops@internal.example')({ subject: 'Internal status', body: 'All systems nominal' });
  const external = await send('partner@external.example')({ subject: 'External status', body: 'Approved public update' });
  let secretBlocked = false;
  try {
    await send('partner@external.example')({ subject: 'Unsafe payload', body: 'api_key=sk-123456789012345678901234' });
  } catch (error) {
    secretBlocked = error.code === 'RULEOAK_DENIED';
  }
  const bundlePath = resolve(baseDir, 'ruleoak-evidence.zip');
  const bundle = createEvidenceBundle(baseDir, bundlePath);
  const result = { baseDir, internal, external, approvals, delivered, secretBlocked, bundle };
  if (!options.quiet) {
    console.log('RuleOak outbound action guard');
    console.log(`Internal destination: ${internal.accepted ? 'allowed' : 'failed'}`);
    console.log(`External destination: ${external.accepted && approvals.length ? 'approved once' : 'failed'}`);
    console.log(`Secret-bearing payload: ${secretBlocked ? 'denied before mock delivery' : 'unexpectedly allowed'}`);
    console.log(`Mock deliveries: ${delivered.length}`);
    console.log(`Evidence bundle: ${bundle.outPath}`);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await runDemo();
