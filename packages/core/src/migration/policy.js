/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeDecisionAction, validatePolicy } from '@ruleoak/protocol';

function slug(value) {
  return String(value || 'rule').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'rule';
}

export function detectPolicyVersion(policy = {}) {
  if (policy?.policyVersion === 2 || Array.isArray(policy?.rules)) return 2;
  return 1;
}

function array(value) { return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.length > 0) : []; }

export function migratePolicyToV2(policy = {}, options = {}) {
  const validation = validatePolicy(policy);
  if (!validation.valid) throw new Error(`cannot migrate invalid policy: ${validation.errors.join('; ')}`);
  const fromVersion = detectPolicyVersion(policy);
  if (fromVersion === 2) {
    return { changed: false, fromVersion: 2, toVersion: 2, policy: structuredClone(policy), warnings: [], summary: { rulesCreated: 0 } };
  }

  const prefix = options.idPrefix || 'migrated';
  const rules = [];
  const warnings = [];
  const blocked = array(policy.blockedActions);
  const approvals = array(policy.approvalRequired);
  const allowed = array(policy.allowedActions);

  blocked.forEach((pattern, index) => rules.push({
    id: `${prefix}-deny-${index + 1}-${slug(pattern)}`,
    description: `Migrated from blockedActions entry ${pattern}`,
    effect: 'deny',
    priority: 300,
    actions: [pattern]
  }));
  approvals.forEach((pattern, index) => rules.push({
    id: `${prefix}-approve-${index + 1}-${slug(pattern)}`,
    description: `Migrated from approvalRequired entry ${pattern}`,
    effect: 'needs_approval',
    priority: 200,
    actions: [pattern]
  }));
  allowed.forEach((pattern, index) => rules.push({
    id: `${prefix}-allow-${index + 1}-${slug(pattern)}`,
    description: `Migrated from allowedActions entry ${pattern}`,
    effect: 'allow',
    priority: 100,
    actions: [pattern]
  }));

  if ([...blocked, ...approvals, ...allowed].includes('*')) warnings.push('legacy wildcard rule migrated; review its scope before production use');
  const defaultAction = normalizeDecisionAction(policy.defaultAction || 'needs_approval');
  if (defaultAction === 'allow') warnings.push('legacy defaultAction=allow preserved; deny or needs_approval is safer');

  const migrated = {
    ...policy,
    policyVersion: 2,
    defaultAction,
    rules,
    exactActionRules: Array.isArray(policy.exactActionRules) ? policy.exactActionRules : [],
    migration: {
      migration_version: '1.0',
      from_policy_version: 1,
      migrated_at: options.migratedAt || new Date().toISOString(),
      tool: '@ruleoak/core',
      review_required: true
    }
  };
  delete migrated.allowedActions;
  delete migrated.approvalRequired;
  delete migrated.blockedActions;

  const migratedValidation = validatePolicy(migrated);
  if (!migratedValidation.valid) throw new Error(`migrated policy is invalid: ${migratedValidation.errors.join('; ')}`);
  return {
    changed: true,
    fromVersion: 1,
    toVersion: 2,
    policy: migrated,
    warnings,
    summary: { rulesCreated: rules.length, denyRules: blocked.length, approvalRules: approvals.length, allowRules: allowed.length }
  };
}
