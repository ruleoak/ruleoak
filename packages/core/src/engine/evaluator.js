/*
 * Copyright © 2026 Sun Shaobin.
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
 * SPDX-FileCopyrightText: 2026 Sun Shaobin
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateActionEnvelope, validatePolicy, normalizeDecisionAction } from '@ruleoak/protocol';

export const DECISION = Object.freeze({
  ALLOW: 'allow',
  DENY: 'deny',
  NEEDS_APPROVAL: 'needs_approval',
  DRY_RUN_ONLY: 'dry_run_only'
});

export class RuleOakPolicyValidationError extends Error {
  constructor(errors) {
    super(`RuleOak policy validation failed: ${errors.join('; ')}`);
    this.name = 'RuleOakPolicyValidationError';
    this.errors = errors;
  }
}

export function assertValidPolicy(policy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) throw new RuleOakPolicyValidationError(validation.errors);
  return true;
}

export function normalizePolicy(policy = {}) {
  return { ...policy, defaultAction: normalizeDecisionAction(policy.defaultAction || DECISION.NEEDS_APPROVAL) };
}

export function actionKey(action) {
  if (!action) return '';
  if (typeof action.type === 'string') return action.type;
  if (typeof action.action === 'string') return action.action;
  return '';
}

export function patternSpecificity(pattern) {
  if (pattern === '*') return 0;
  if (pattern.endsWith('.*')) return 1;
  return 2;
}

export function matchesPattern(pattern, key) {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) return key.startsWith(pattern.slice(0, -1));
  return pattern === key;
}

function bestMatch(patterns = [], key) {
  let best = null;
  for (const pattern of patterns || []) {
    if (matchesPattern(pattern, key)) {
      const specificity = patternSpecificity(pattern);
      if (!best || specificity > best.specificity) best = { pattern, specificity };
    }
  }
  return best;
}

export function evaluatePolicy(action, rawPolicy = {}) {
  const actionValidation = validateActionEnvelope(action);
  if (!actionValidation.valid) {
    return { action: DECISION.DENY, reason: `invalid action: ${actionValidation.errors.join('; ')}`, matchedPattern: null };
  }
  assertValidPolicy(rawPolicy);
  const policy = normalizePolicy(rawPolicy);

  const key = actionKey(action);
  const blocked = bestMatch(policy.blockedActions || [], key);
  if (blocked) {
    return { action: DECISION.DENY, reason: `blockedActions always wins: ${blocked.pattern}`, matchedPattern: blocked.pattern, matchedRule: blocked.pattern, specificity: blocked.specificity };
  }

  const allowed = bestMatch(policy.allowedActions || [], key);
  const approval = bestMatch(policy.approvalRequired || [], key);

  if (allowed && approval) {
    if (allowed.specificity > approval.specificity) return { action: DECISION.ALLOW, reason: `more-specific allowedActions match: ${allowed.pattern}`, matchedPattern: allowed.pattern, matchedRule: allowed.pattern, specificity: allowed.specificity };
    if (approval.specificity > allowed.specificity) return { action: DECISION.NEEDS_APPROVAL, reason: `more-specific approvalRequired match: ${approval.pattern}`, matchedPattern: approval.pattern, matchedRule: approval.pattern, specificity: approval.specificity };
    return { action: DECISION.NEEDS_APPROVAL, reason: `same-specificity allow/approval conflict; approval wins safe: ${approval.pattern}`, matchedPattern: approval.pattern, matchedRule: approval.pattern, specificity: approval.specificity };
  }

  if (allowed) return { action: DECISION.ALLOW, reason: `matched allowedActions: ${allowed.pattern}`, matchedPattern: allowed.pattern, matchedRule: allowed.pattern, specificity: allowed.specificity };
  if (approval) return { action: DECISION.NEEDS_APPROVAL, reason: `matched approvalRequired: ${approval.pattern}`, matchedPattern: approval.pattern, matchedRule: approval.pattern, specificity: approval.specificity };

  const defaultAction = policy.defaultAction || DECISION.NEEDS_APPROVAL;
  return { action: defaultAction, reason: `defaultAction: ${defaultAction}; no explicit policy match`, matchedPattern: null, matchedRule: 'defaultAction', specificity: -1 };
}

export class RuleOakEngine {
  constructor(policy = {}) {
    assertValidPolicy(policy);
    this.policy = normalizePolicy(policy);
  }

  evaluate(action) {
    return evaluatePolicy(action, this.policy);
  }
}
