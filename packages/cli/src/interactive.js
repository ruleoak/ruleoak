/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface } from 'node:readline/promises';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';

export const INTERACTIVE_APPROVAL_CHOICES = Object.freeze([
  { shortcut: '1', decision: 'allow_once', label: 'Allow once', persistent: false },
  { shortcut: '2', decision: 'deny_once', label: 'Deny once', persistent: false },
  { shortcut: '3', decision: 'allow_session', label: 'Allow this session', persistent: false },
  { shortcut: '4', decision: 'always_ask', label: 'Always ask for this exact action', persistent: true },
  { shortcut: '5', decision: 'always_allow', label: 'Always allow this exact action', persistent: true },
  { shortcut: '6', decision: 'always_block', label: 'Always block this exact action', persistent: true },
  { shortcut: 'q', decision: 'cancel', label: 'Cancel', persistent: false }
]);

function text(value, fallback = 'unknown') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

export function approvalDetails(record = {}) {
  const classification = record.classification || {};
  const call = record.normalized_call || {};
  const actor = call.actor || {};
  const tool = call.tool || {};
  const target = call.target || {};
  const trace = record.policy_trace || record.decision_receipt?.trace || record.action?.metadata?.policy_trace || [];
  return {
    approvalId: text(record.approval_id),
    actor: text(actor.name || record.action?.metadata?.actor),
    actorType: text(actor.type || record.action?.metadata?.actor_type),
    tool: text(tool.name || record.action?.type),
    operation: text(tool.operation || record.action?.metadata?.operation),
    target: text(target.resource || record.action?.target, '(none)'),
    risk: text(record.risk || classification.risk),
    reason: text(record.reason),
    dataFlow: text(classification.data_flow || record.action?.metadata?.data_flow),
    sideEffect: text(classification.side_effect || record.action?.metadata?.side_effect),
    arguments: record.action?.arguments || {},
    trace: Array.isArray(trace) ? trace : []
  };
}

export function renderApprovalDetails(record = {}) {
  const details = approvalDetails(record);
  const lines = [
    'RuleOak approval request',
    '',
    `Actor: ${details.actor} (${details.actorType})`,
    `Tool: ${details.tool}`,
    `Operation: ${details.operation}`,
    `Target: ${details.target}`,
    `Risk: ${details.risk}`,
    `Reason: ${details.reason}`,
    `Data flow: ${details.dataFlow}`,
    `Side effect: ${details.sideEffect}`,
    'Redacted arguments:',
    JSON.stringify(details.arguments, null, 2)
  ];
  if (details.trace.length) {
    lines.push('Policy trace:');
    for (const item of details.trace) lines.push(`- ${JSON.stringify(item)}`);
  }
  return lines.join('\n');
}

export function resolveApprovalChoice(input) {
  const value = String(input ?? '').trim().toLowerCase();
  return INTERACTIVE_APPROVAL_CHOICES.find(choice => choice.shortcut === value || choice.decision === value) || null;
}

export function choosePendingRecord(records = [], input) {
  if (!records.length) return null;
  const value = String(input ?? '').trim();
  if (!value) return records[0];
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= records.length) return records[numeric - 1];
  return records.find(record => record.approval_id === value) || null;
}

export function renderPendingSelection(records = []) {
  if (!records.length) return 'No pending approvals';
  const lines = ['Pending RuleOak approvals', ''];
  records.forEach((record, index) => {
    const details = approvalDetails(record);
    lines.push(`${index + 1}) ${details.tool} → ${details.target}`);
    lines.push(`   Risk ${details.risk} · ${details.reason}`);
  });
  return lines.join('\n');
}

export async function promptApprovalDecision(record, options = {}) {
  const input = options.input || defaultInput;
  const output = options.output || defaultOutput;
  const ask = options.ask;
  const question = async prompt => {
    if (typeof ask === 'function') return await ask(prompt);
    const rl = createInterface({ input, output });
    try { return await rl.question(prompt); }
    finally { rl.close(); }
  };

  output.write(`${renderApprovalDetails(record)}\n\n`);
  for (const choice of INTERACTIVE_APPROVAL_CHOICES) output.write(`${choice.shortcut}) ${choice.label}\n`);
  const selected = resolveApprovalChoice(await question('Decision: '));
  if (!selected || selected.decision === 'cancel') return { decision: 'cancel', confirmed: false };
  if (!selected.persistent) return { decision: selected.decision, confirmed: true };
  const confirmation = String(await question(`Confirm persistent choice "${selected.label}"? Type yes: `)).trim().toLowerCase();
  return { decision: selected.decision, confirmed: confirmation === 'yes' };
}

export async function runInteractiveApprovalInbox(records = [], decide, options = {}) {
  const output = options.output || defaultOutput;
  if (!records.length) {
    output.write('No pending approvals\n');
    return { decided: false, reason: 'empty' };
  }
  output.write(`${renderPendingSelection(records)}\n`);
  const ask = options.ask;
  let selection;
  if (typeof ask === 'function') selection = await ask('Select approval number or ID: ');
  else {
    const rl = createInterface({ input: options.input || defaultInput, output });
    try { selection = await rl.question('Select approval number or ID: '); }
    finally { rl.close(); }
  }
  const record = choosePendingRecord(records, selection);
  if (!record) return { decided: false, reason: 'invalid-selection' };
  const result = await promptApprovalDecision(record, options);
  if (!result.confirmed || result.decision === 'cancel') return { decided: false, reason: 'cancelled', record };
  const decisionResult = await decide(record.approval_id, result.decision);
  return { decided: true, record, decision: result.decision, result: decisionResult };
}
