/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validatePolicy, normalizeDecisionAction } from '@ruleoak/protocol';

function duplicateValues(values = []) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function overlap(a = [], b = []) {
  const bSet = new Set(b);
  return [...new Set(a.filter(value => bSet.has(value)))].sort();
}

export function lintPolicy(policy = {}) {
  const validation = validatePolicy(policy);
  const errors = [...validation.errors];
  const warnings = [];
  const notes = [];

  if (!validation.valid) return { valid: false, errors, warnings, notes, summary: { errorCount: errors.length, warningCount: 0 } };

  const defaultAction = normalizeDecisionAction(policy.defaultAction || 'needs_approval');
  if (defaultAction === 'allow') warnings.push('defaultAction is allow; unknown actions will run unless another rule blocks them');
  if ((policy.allowedActions || []).includes('*')) warnings.push('allowedActions contains *; this permits every unmatched action');
  if ((policy.approvalRequired || []).includes('*')) notes.push('approvalRequired contains *; this is a safe fallback for legacy policies');

  for (const key of ['allowedActions', 'approvalRequired', 'blockedActions']) {
    for (const duplicate of duplicateValues(policy[key] || [])) warnings.push(`${key} contains duplicate pattern: ${duplicate}`);
  }

  for (const value of overlap(policy.allowedActions, policy.blockedActions)) warnings.push(`pattern appears in both allowedActions and blockedActions; deny will win: ${value}`);
  for (const value of overlap(policy.allowedActions, policy.approvalRequired)) warnings.push(`pattern appears in both allowedActions and approvalRequired; specificity/tie rules apply: ${value}`);

  const exactRules = policy.exactActionRules || [];
  for (const duplicate of duplicateValues(exactRules.map(rule => rule.decision_key))) errors.push(`exactActionRules contains duplicate decision_key: ${duplicate}`);
  for (const rule of exactRules) {
    if (normalizeDecisionAction(rule.effect) === 'allow' && rule.allowCritical !== true) notes.push(`exact allow rule ${rule.id || rule.decision_key} does not opt in to critical-risk override`);
    if (rule.disabled === true && rule.status === 'enabled') warnings.push(`exact rule ${rule.id || rule.decision_key} has inconsistent disabled=true and status=enabled`);
  }

  const rules = policy.rules || [];
  for (const duplicate of duplicateValues(rules.map(rule => rule.id))) errors.push(`rules contains duplicate id: ${duplicate}`);
  for (const rule of rules) {
    const effect = normalizeDecisionAction(rule.effect);
    const actions = rule.actions || ['*'];
    const resources = rule.resources || ['*'];
    if (effect === 'allow' && actions.includes('*') && resources.includes('*')) warnings.push(`structured rule ${rule.id} allows every action and resource`);
    if (effect === 'allow' && rule.riskAtLeast === 'critical' && rule.allowCritical !== true) warnings.push(`structured rule ${rule.id} targets critical risk but allowCritical is not true`);
    if (rule.riskAtLeast && rule.riskAtMost) {
      const rank = { safe: 0, low: 1, medium: 2, high: 3, critical: 4 };
      if (rank[rule.riskAtLeast] > rank[rule.riskAtMost]) errors.push(`structured rule ${rule.id} has riskAtLeast above riskAtMost`);
    }
    if (rule.disabled === true && rule.status === 'enabled') warnings.push(`structured rule ${rule.id} has inconsistent disabled=true and status=enabled`);
  }

  if (!rules.length && !policy.allowedActions?.length && !policy.approvalRequired?.length && !policy.blockedActions?.length && !exactRules.length) {
    warnings.push('policy has no explicit rules and relies only on defaultAction');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    notes,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      noteCount: notes.length,
      structuredRuleCount: rules.length,
      exactRuleCount: exactRules.length,
      legacyPatternCount: (policy.allowedActions || []).length + (policy.approvalRequired || []).length + (policy.blockedActions || []).length
    }
  };
}
