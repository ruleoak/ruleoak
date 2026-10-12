/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { evaluatePolicy, DECISION } from '../engine/evaluator.js';
import { classifyRisk } from './classifier.js';
import { normalizeToolCall, actionFromNormalizedToolCall } from './normalizer.js';
import { redactObject } from './redactor.js';
import { applySessionDecision, approvalFingerprint } from './approval.js';
import { buildDecisionReceipt } from '../decision/receipt.js';
import { authorizeWithAuthorityGrant } from '../authority/grant.js';
import { authorizeWithAuthorityEnvelope } from '../authority/envelope.js';

function firstReason(classification) {
  return classification.reasons[0] || 'RuleOak policy evaluation';
}

function withRisk(decision, classification, source = 'policy') {
  return {
    ...decision,
    risk: classification.risk,
    riskReasons: classification.reasons,
    detectedSecrets: classification.detectedSecrets,
    detectedPromptInjection: classification.detectedPromptInjection,
    secretExfiltrationRisk: classification.secretExfiltrationRisk,
    promptInjectionSideEffectRisk: classification.promptInjectionSideEffectRisk,
    dataFlow: classification.dataFlow,
    sideEffect: classification.sideEffect,
    untrustedInput: classification.untrustedInput,
    source
  };
}

function isExplicitAllow(decision) {
  const rule = String(decision?.matchedRule || '');
  return decision?.action === DECISION.ALLOW && (rule.startsWith('exactActionRules:') || rule.startsWith('rules:'));
}

export function evaluatePermissionRequest(input, policy = {}, options = {}) {
  const normalizedCall = normalizeToolCall(input, options);
  const classification = classifyRisk(normalizedCall);
  const redactedArguments = redactObject(normalizedCall.arguments || {});
  const action = actionFromNormalizedToolCall(normalizedCall, redactedArguments);
  const authorityGrant = options.authorityGrant || normalizedCall.context?.authority_grant || input?.authority_grant || null;
  const authorityEnvelope = options.authorityEnvelope || normalizedCall.context?.authority_envelope || input?.authority_envelope || null;
  const authority = authorityEnvelope ? authorizeWithAuthorityEnvelope(authorityEnvelope, normalizedCall, {
    grant: authorityGrant, authoritySecret: options.authoritySecret, envelopeSecret: options.envelopeSecret || options.authoritySecret,
    requireAuthoritySignature: options.requireAuthoritySignature !== false, requireEnvelopeSignature: options.requireEnvelopeSignature !== false,
    bindSubject: options.bindAuthoritySubject !== false, revocationRegistry: options.revocationRegistry, now: options.evaluatedAt
  }) : authorityGrant ? authorizeWithAuthorityGrant(authorityGrant, normalizedCall, {
    secret: options.authoritySecret, requireSignature: options.requireAuthoritySignature !== false, bindSubject: options.bindAuthoritySubject !== false,
    revocationRegistry: options.revocationRegistry, now: options.evaluatedAt
  }) : null;
  const principalIds = authorityGrant?.principal_chain?.map(principal => principal?.id).filter(Boolean) || [];
  action.metadata = {
    ...(action.metadata || {}),
    actor_type: normalizedCall.actor?.type,
    approval_key: approvalFingerprint(normalizedCall),
    risk: classification.risk,
    data_flow: classification.dataFlow,
    side_effect: classification.sideEffect,
    untrusted_input: classification.untrustedInput,
    agent_id: normalizedCall.actor?.id || normalizedCall.actor?.name,
    principal_ids: principalIds,
    authority_grant_id: authorityGrant?.grant_id,
    authority_envelope_id: authorityEnvelope?.envelope_id,
    canonical_action: authority?.canonicalAction,
    canonical_resource: authority?.canonicalResource,
    intent_id: authorityGrant?.intent_id || normalizedCall.context?.intent_id,
    task_id: authorityGrant?.task_id || normalizedCall.context?.task_id
  };

  let decision;

  if (authority && !authority.ok) {
    decision = withRisk({
      action: DECISION.DENY,
      reason: `blocked by authority grant: ${authority.errors.join('; ')}`,
      matchedRule: 'authority-grant',
      matchedRules: ['authority-grant'],
      trace: [{ stage: 'authority-grant', grant_id: authorityGrant?.grant_id || null, result: 'deny', errors: authority.errors }]
    }, classification, 'authority-grant');
  } else if (classification.secretExfiltrationRisk) {
    decision = withRisk({
      action: DECISION.DENY,
      reason: 'blocked because a credential-like secret may cross an external trust boundary',
      matchedRule: 'secret-exfiltration-guard',
      matchedRules: ['secret-exfiltration-guard'],
      trace: [{ stage: 'risk-guard', guard: 'secret-exfiltration', result: 'deny' }]
    }, classification, 'risk-guard');
  } else if (classification.promptInjectionSideEffectRisk) {
    decision = withRisk({
      action: DECISION.DENY,
      reason: 'blocked because prompt-injection-like content is combined with a side effect or external flow',
      matchedRule: 'prompt-injection-side-effect-guard',
      matchedRules: ['prompt-injection-side-effect-guard'],
      trace: [{ stage: 'risk-guard', guard: 'prompt-injection-side-effect', result: 'deny' }]
    }, classification, 'risk-guard');
  } else {
    const policyDecision = evaluatePolicy(action, policy);
    decision = withRisk(policyDecision, classification, 'policy');

    if (classification.detectedPromptInjection && classification.sideEffect === 'read_only' && policyDecision.action !== DECISION.DENY) {
      decision = withRisk({
        action: DECISION.NEEDS_APPROVAL,
        reason: 'approval required because prompt-injection-like content was detected in a read-only flow',
        matchedRule: 'prompt-injection-read-guard',
        matchedRules: ['prompt-injection-read-guard'],
        trace: [...(policyDecision.trace || []), { stage: 'risk-guard', guard: 'prompt-injection-read', result: 'needs_approval' }]
      }, classification, 'risk-guard');
    } else if (classification.risk === 'critical') {
      const criticalAllowed = isExplicitAllow(policyDecision) && policyDecision.allowCritical === true;
      if (!criticalAllowed && policyDecision.action !== DECISION.DENY) {
        decision = withRisk({
          action: DECISION.DENY,
          reason: `blocked because ${firstReason(classification)}; critical actions require an explicit rule with allowCritical=true`,
          matchedRule: 'critical-risk-default',
          matchedRules: ['critical-risk-default'],
          trace: [...(policyDecision.trace || []), { stage: 'risk-guard', guard: 'critical-risk-default', result: 'deny' }]
        }, classification, 'risk-guard');
      }
    } else if (policyDecision.action === DECISION.ALLOW && ['medium', 'high'].includes(classification.risk) && !isExplicitAllow(policyDecision)) {
      decision = withRisk({
        action: DECISION.NEEDS_APPROVAL,
        reason: `approval required because ${firstReason(classification)}`,
        matchedRule: 'risk-upgrade',
        matchedRules: ['risk-upgrade'],
        trace: [...(policyDecision.trace || []), { stage: 'risk-guard', guard: 'risk-upgrade', result: 'needs_approval' }]
      }, classification, 'risk-guard');
    }

    if (classification.risk !== 'critical') {
      decision = applySessionDecision(decision, normalizedCall, options.sessionDecisionCache || options.sessionDecisions || {});
    }
  }

  if (decision.action === DECISION.NEEDS_APPROVAL) decision = { ...decision, approvalCacheKey: approvalFingerprint(normalizedCall) };

  const result = { normalizedCall, action, classification, decision, authority };
  const receipt = buildDecisionReceipt(result, policy, {
    evaluatedAt: options.evaluatedAt,
    ttlMs: options.receiptTtlMs,
    secret: options.receiptSecret,
    audience: options.receiptAudience,
    issuer: options.receiptIssuer,
    oneTime: options.receiptOneTime
  });
  result.decision = { ...decision, receipt };
  return result;
}
