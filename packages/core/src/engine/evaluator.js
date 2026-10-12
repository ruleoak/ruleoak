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

import { validateActionEnvelope, validatePolicy, normalizeDecisionAction } from '@ruleoak/protocol';

export const DECISION = Object.freeze({
  ALLOW: 'allow',
  DENY: 'deny',
  NEEDS_APPROVAL: 'needs_approval',
  DRY_RUN_ONLY: 'dry_run_only'
});

const RISK_RANK = Object.freeze({ safe: 0, low: 1, medium: 2, high: 3, critical: 4 });
const EFFECT_TIE_BREAK = Object.freeze({ deny: 4, needs_approval: 3, dry_run_only: 2, allow: 1 });

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
  return {
    policyVersion: policy.policyVersion || (Array.isArray(policy.rules) ? 2 : 1),
    ...policy,
    defaultAction: normalizeDecisionAction(policy.defaultAction || DECISION.NEEDS_APPROVAL)
  };
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
  if (pattern.includes('*') || pattern.includes('?')) return 1;
  return 2;
}

export function matchesPattern(pattern, key) {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*') && !pattern.slice(0, -2).includes('*')) return key.startsWith(pattern.slice(0, -1));
  if (!pattern.includes('*') && !pattern.includes('?')) return pattern === key;
  return globToRegExp(pattern).test(key);
}

function globToRegExp(pattern) {
  let output = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        output += '.*';
        i += 1;
      } else output += '[^/]*';
    } else if (char === '?') output += '.';
    else output += char.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
  }
  return new RegExp(`${output}$`);
}

export function matchesResourcePattern(pattern, resource = '') {
  if (pattern === '*' || pattern === '**') return true;
  return globToRegExp(String(pattern)).test(String(resource));
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

function enabled(rule) {
  return rule && rule.disabled !== true && rule.status !== 'disabled';
}

function exactActionRulesFor(rules = [], action = {}) {
  const key = action?.metadata?.approval_key || action?.metadata?.decision_key;
  if (!key) return [];
  return (rules || []).filter(rule => enabled(rule) && rule.decision_key === key);
}

function matchesAny(values, candidate) {
  if (!Array.isArray(values) || values.length === 0) return true;
  return values.includes(candidate);
}

function matchesAnyOverlap(values, candidates) {
  if (!Array.isArray(values) || values.length === 0) return true;
  if (!Array.isArray(candidates)) return false;
  return values.some(value => candidates.includes(value));
}

function structuredRuleMatch(rule, action) {
  if (!enabled(rule)) return null;
  const key = actionKey(action);
  const resource = action.target || '';
  const metadata = action.metadata || {};
  const actionPatterns = Array.isArray(rule.actions) && rule.actions.length ? rule.actions : ['*'];
  const resourcePatterns = Array.isArray(rule.resources) && rule.resources.length ? rule.resources : ['*'];
  const actionMatches = actionPatterns.filter(pattern => matchesPattern(pattern, key));
  if (!actionMatches.length) return null;
  const resourceMatches = resourcePatterns.filter(pattern => matchesResourcePattern(pattern, resource));
  if (!resourceMatches.length) return null;
  const conditions = rule.conditions || {};
  if (!matchesAny(conditions.categories, metadata.category)) return null;
  if (!matchesAny(conditions.operations, metadata.operation)) return null;
  if (!matchesAny(conditions.sensitivities, metadata.sensitivity)) return null;
  if (!matchesAny(conditions.dataFlows, metadata.data_flow)) return null;
  if (!matchesAny(conditions.sideEffects, metadata.side_effect)) return null;
  if (!matchesAny(conditions.actorTypes, metadata.actor_type)) return null;
  if (!matchesAny(conditions.actorNames, metadata.actor)) return null;
  if (!matchesAny(conditions.sessionIds, metadata.session_id)) return null;
  if (!matchesAny(conditions.scopes, metadata.scope)) return null;
  if (!matchesAny(conditions.agentIds, metadata.agent_id)) return null;
  if (!matchesAnyOverlap(conditions.principalIds, metadata.principal_ids)) return null;
  if (!matchesAny(conditions.grantIds, metadata.authority_grant_id)) return null;
  if (!matchesAny(conditions.intentIds, metadata.intent_id)) return null;
  if (!matchesAny(conditions.taskIds, metadata.task_id)) return null;
  const risk = metadata.risk || 'safe';
  if (rule.riskAtLeast && RISK_RANK[risk] < RISK_RANK[rule.riskAtLeast]) return null;
  if (rule.riskAtMost && RISK_RANK[risk] > RISK_RANK[rule.riskAtMost]) return null;
  const specificity = Math.max(...actionMatches.map(patternSpecificity))
    + Math.max(...resourceMatches.map(pattern => patternSpecificity(pattern)))
    + Object.values(conditions).filter(value => Array.isArray(value) && value.length > 0).length;
  return {
    rule,
    effect: normalizeDecisionAction(rule.effect),
    priority: Number.isInteger(rule.priority) ? rule.priority : 0,
    specificity,
    actionPattern: actionMatches.sort((a, b) => patternSpecificity(b) - patternSpecificity(a))[0],
    resourcePattern: resourceMatches.sort((a, b) => patternSpecificity(b) - patternSpecificity(a))[0]
  };
}

function chooseStructuredMatch(matches) {
  return [...matches].sort((a, b) =>
    b.priority - a.priority
    || b.specificity - a.specificity
    || (EFFECT_TIE_BREAK[b.effect] || 0) - (EFFECT_TIE_BREAK[a.effect] || 0)
    || String(a.rule.id).localeCompare(String(b.rule.id))
  )[0] || null;
}

function structuredDecision(match, trace) {
  return {
    action: match.effect,
    reason: `matched structured rule ${match.rule.id}${match.rule.description ? `: ${match.rule.description}` : ''}`,
    matchedPattern: match.actionPattern,
    matchedRule: `rules:${match.rule.id}`,
    matchedRules: [match.rule.id],
    priority: match.priority,
    specificity: match.specificity,
    allowCritical: match.rule.allowCritical === true,
    trace
  };
}

function exactDecision(rule, trace) {
  const effect = normalizeDecisionAction(rule.effect);
  return {
    action: effect,
    reason: `matched exactActionRules: ${rule.id || rule.decision_key}`,
    matchedPattern: rule.decision_key,
    matchedRule: `exactActionRules:${rule.id || rule.decision_key}`,
    matchedRules: [rule.id || rule.decision_key],
    specificity: 100,
    allowCritical: rule.allowCritical === true,
    trace
  };
}

export function evaluatePolicy(action, rawPolicy = {}) {
  const actionValidation = validateActionEnvelope(action);
  if (!actionValidation.valid) {
    return { action: DECISION.DENY, reason: `invalid action: ${actionValidation.errors.join('; ')}`, matchedPattern: null, matchedRule: 'validation', trace: [{ stage: 'validation', result: 'deny' }] };
  }
  assertValidPolicy(rawPolicy);
  const policy = normalizePolicy(rawPolicy);
  const key = actionKey(action);
  const trace = [];

  const exactMatches = exactActionRulesFor(policy.exactActionRules || [], action);
  const exactDeny = exactMatches.find(rule => normalizeDecisionAction(rule.effect) === DECISION.DENY);
  if (exactDeny) {
    trace.push({ stage: 'exact-action', rule: exactDeny.id || exactDeny.decision_key, effect: 'deny', result: 'matched' });
    return exactDecision(exactDeny, trace);
  }

  const structuredMatches = (policy.rules || []).map(rule => structuredRuleMatch(rule, action)).filter(Boolean);
  const structuredDenies = structuredMatches.filter(match => match.effect === DECISION.DENY);
  if (structuredDenies.length) {
    const match = chooseStructuredMatch(structuredDenies);
    trace.push({ stage: 'structured-rules', rule: match.rule.id, effect: 'deny', result: 'matched', priority: match.priority });
    return structuredDecision(match, trace);
  }

  const blocked = bestMatch(policy.blockedActions || [], key);
  if (blocked) {
    trace.push({ stage: 'legacy-blockedActions', pattern: blocked.pattern, effect: 'deny', result: 'matched' });
    return {
      action: DECISION.DENY,
      reason: `blockedActions always wins: ${blocked.pattern}`,
      matchedPattern: blocked.pattern,
      matchedRule: blocked.pattern,
      matchedRules: [blocked.pattern],
      specificity: blocked.specificity,
      trace
    };
  }

  const exactApproval = exactMatches.find(rule => normalizeDecisionAction(rule.effect) === DECISION.NEEDS_APPROVAL);
  if (exactApproval) {
    trace.push({ stage: 'exact-action', rule: exactApproval.id || exactApproval.decision_key, effect: 'needs_approval', result: 'matched' });
    return exactDecision(exactApproval, trace);
  }

  const exactAllow = exactMatches.find(rule => normalizeDecisionAction(rule.effect) === DECISION.ALLOW);
  if (exactAllow) {
    trace.push({ stage: 'exact-action', rule: exactAllow.id || exactAllow.decision_key, effect: 'allow', result: 'matched' });
    return exactDecision(exactAllow, trace);
  }

  if (structuredMatches.length) {
    const match = chooseStructuredMatch(structuredMatches);
    trace.push({ stage: 'structured-rules', rule: match.rule.id, effect: match.effect, result: 'matched', priority: match.priority });
    return structuredDecision(match, trace);
  }

  const allowed = bestMatch(policy.allowedActions || [], key);
  const approval = bestMatch(policy.approvalRequired || [], key);
  if (allowed && approval) {
    if (allowed.specificity > approval.specificity) {
      trace.push({ stage: 'legacy-conflict', result: 'allow', reason: 'more-specific allow' });
      return { action: DECISION.ALLOW, reason: `more-specific allowedActions match: ${allowed.pattern}`, matchedPattern: allowed.pattern, matchedRule: allowed.pattern, matchedRules: [allowed.pattern], specificity: allowed.specificity, trace };
    }
    trace.push({ stage: 'legacy-conflict', result: 'needs_approval', reason: approval.specificity > allowed.specificity ? 'more-specific approval' : 'safe tie-break' });
    return { action: DECISION.NEEDS_APPROVAL, reason: `${approval.specificity > allowed.specificity ? 'more-specific' : 'same-specificity allow/approval conflict;'} approvalRequired match: ${approval.pattern}`, matchedPattern: approval.pattern, matchedRule: approval.pattern, matchedRules: [approval.pattern], specificity: approval.specificity, trace };
  }
  if (allowed) {
    trace.push({ stage: 'legacy-allowedActions', pattern: allowed.pattern, result: 'allow' });
    return { action: DECISION.ALLOW, reason: `matched allowedActions: ${allowed.pattern}`, matchedPattern: allowed.pattern, matchedRule: allowed.pattern, matchedRules: [allowed.pattern], specificity: allowed.specificity, trace };
  }
  if (approval) {
    trace.push({ stage: 'legacy-approvalRequired', pattern: approval.pattern, result: 'needs_approval' });
    return { action: DECISION.NEEDS_APPROVAL, reason: `matched approvalRequired: ${approval.pattern}`, matchedPattern: approval.pattern, matchedRule: approval.pattern, matchedRules: [approval.pattern], specificity: approval.specificity, trace };
  }

  const defaultAction = policy.defaultAction || DECISION.NEEDS_APPROVAL;
  trace.push({ stage: 'default', result: defaultAction });
  return { action: defaultAction, reason: `defaultAction: ${defaultAction}; no explicit policy match`, matchedPattern: null, matchedRule: 'defaultAction', matchedRules: [], specificity: -1, trace };
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
