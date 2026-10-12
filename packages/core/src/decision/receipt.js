/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { validateDecisionReceipt } from '@ruleoak/protocol';
import { normalizeToolCall } from '../permission/normalizer.js';

export function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function canonicalDigest(value) {
  return `sha256:${createHash('sha256').update(canonicalStringify(value)).digest('hex')}`;
}

export function actionDigest(input, options = {}) {
  const call = normalizeToolCall(input, options);
  return canonicalDigest({
    actor: call.actor,
    tool: call.tool,
    target: call.target,
    arguments: call.arguments,
    context: call.context
  });
}

export function policyDigest(policy = {}) {
  return canonicalDigest(policy);
}

function unsignedReceipt(receipt) {
  const { signature, ...payload } = receipt || {};
  return payload;
}

export function signDecisionReceipt(receipt, secret) {
  if (!secret) throw new Error('receipt signing secret is required');
  const signature = `hmac-sha256:${createHmac('sha256', String(secret)).update(canonicalStringify(unsignedReceipt(receipt))).digest('hex')}`;
  return { ...unsignedReceipt(receipt), signature };
}

export function buildDecisionReceipt(result, policy = {}, options = {}) {
  const evaluatedAt = options.evaluatedAt || new Date().toISOString();
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(1000, options.ttlMs) : 5 * 60 * 1000;
  const defaultExpiresMs = new Date(evaluatedAt).getTime() + ttlMs;
  const capExpiresMs = options.expiresAt ? new Date(options.expiresAt).getTime() : NaN;
  const expiresAt = new Date(Number.isFinite(capExpiresMs) ? Math.min(defaultExpiresMs, capExpiresMs) : defaultExpiresMs).toISOString();
  const receipt = {
    receipt_version: options.approvalResult ? '1.2' : '1.1',
    decision_id: options.decisionId || `dec_${randomUUID()}`,
    nonce: options.nonce || randomUUID(),
    issuer: options.issuer || 'ruleoak',
    audience: options.audience || 'ruleoak-executor',
    one_time: options.oneTime !== false,
    evaluated_at: evaluatedAt,
    not_before: options.notBefore || evaluatedAt,
    expires_at: expiresAt,
    action_digest: actionDigest(result.normalizedCall || result.action || {}, options),
    policy_digest: policyDigest(policy),
    decision: result.decision?.action || 'deny',
    risk: result.classification?.risk || result.decision?.risk || 'unknown',
    source: result.decision?.source || 'policy',
    matched_rule: result.decision?.matchedRule || null,
    call_id: result.normalizedCall?.call_id || result.action?.metadata?.call_id || null,
    session_id: result.normalizedCall?.actor?.session_id || result.action?.metadata?.session_id || null,
    authority_grant_id: result.authority?.grant?.grant_id || result.action?.metadata?.authority_grant_id || null,
    authority_envelope_id: result.authority?.envelope?.envelope_id || result.action?.metadata?.authority_envelope_id || null,
    principal_id: result.normalizedCall?.actor?.id || result.normalizedCall?.actor?.name || null,
    canonical_action: result.authority?.canonicalAction || result.action?.metadata?.canonical_action || null,
    canonical_resource: result.authority?.canonicalResource || result.action?.metadata?.canonical_resource || null,
    intent_id: result.authority?.grant?.intent_id || result.action?.metadata?.intent_id || null,
    task_id: result.authority?.grant?.task_id || result.action?.metadata?.task_id || null,
    ...(options.approvalResult ? {
      approval_id: options.approvalRequest?.approval_id || options.approvalResult.approval_id,
      approval_result_id: options.approvalResult.approval_result_id,
      approval_request_decision_id: options.approvalResult.request_decision_id,
      approval_provider_id: options.approvalResult.provider_id
    } : {})
  };
  return options.secret ? signDecisionReceipt(receipt, options.secret) : receipt;
}

function safeEqualString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyDecisionReceipt(receipt, options = {}) {
  const validation = validateDecisionReceipt(receipt);
  const errors = [...validation.errors];
  const now = new Date(options.now || new Date()).getTime();
  const notBefore = new Date(receipt?.not_before || receipt?.evaluated_at || 0).getTime();
  const expires = new Date(receipt?.expires_at || 0).getTime();
  if (!Number.isFinite(notBefore) || notBefore > now) errors.push('decision receipt is not active yet');
  if (!Number.isFinite(expires) || expires <= now) errors.push('decision receipt has expired');
  if (options.input && receipt?.action_digest !== actionDigest(options.input, { ...options, sessionId: options.sessionId || receipt?.session_id })) errors.push('action digest mismatch');
  if (options.policy && receipt?.policy_digest !== policyDigest(options.policy)) errors.push('policy digest mismatch');
  if (options.audience && receipt?.audience && receipt.audience !== options.audience) errors.push(`receipt audience mismatch: expected ${options.audience}`);
  if (options.requireSignature && !options.secret) errors.push('receipt verification secret is required');
  if (options.secret) {
    if (!receipt?.signature) errors.push('signed receipt required');
    else {
      const expected = signDecisionReceipt(unsignedReceipt(receipt), options.secret).signature;
      if (!safeEqualString(receipt.signature, expected)) errors.push('receipt signature mismatch');
    }
  } else if (options.requireSignature && !receipt?.signature) errors.push('signed receipt required');
  if (options.requireAllow && receipt?.decision !== 'allow') errors.push(`receipt decision is not allow: ${receipt?.decision}`);
  return { ok: errors.length === 0, errors, receipt };
}

export function verifyExecutionGrant(receipt, input, policy, secret, options = {}) {
  return verifyDecisionReceipt(receipt, { ...options, input, policy, secret, requireAllow: true, requireSignature: options.requireSignature !== false });
}

