/*
 * Copyright © 2026 The RuleOak Authors.
 * SPDX-FileCopyrightText: 2026 The RuleOak Authors
 * SPDX-License-Identifier: MIT
 */

export const DECISIONS = ['allow', 'deny', 'block', 'needs_approval', 'dry_run_only'];
export const CANONICAL_DECISIONS = ['allow', 'deny', 'needs_approval', 'dry_run_only'];

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeDecisionAction(value) {
  return value === 'block' ? 'deny' : value;
}

export function validateActionEnvelope(action) {
  const errors = [];
  if (!isObject(action)) errors.push('action must be an object');
  if (isObject(action)) {
    const hasType = typeof action.type === 'string' && action.type.length > 0;
    const hasAction = typeof action.action === 'string' && action.action.length > 0;
    if (!hasType && !hasAction) errors.push('action.type is required');
    if (action.type !== undefined && typeof action.type !== 'string') errors.push('action.type must be a string when present');
    if (action.action !== undefined && typeof action.action !== 'string') errors.push('action.action must be a string when present');
    if (action.target !== undefined && typeof action.target !== 'string') errors.push('action.target must be a string when present');
    if (action.arguments !== undefined && !isObject(action.arguments)) errors.push('action.arguments must be an object when present');
    if (action.metadata !== undefined && !isObject(action.metadata)) errors.push('action.metadata must be an object when present');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function validatePolicy(policy) {
  const errors = [];
  if (!isObject(policy)) errors.push('policy must be an object');
  if (isObject(policy)) {
    const validDefaults = ['allow', 'deny', 'block', 'needs_approval', 'dry_run_only'];
    if (policy.defaultAction !== undefined && !validDefaults.includes(policy.defaultAction)) errors.push('policy.defaultAction is invalid');
    for (const key of ['allowedActions', 'approvalRequired', 'blockedActions']) {
      if (policy[key] !== undefined && (!Array.isArray(policy[key]) || policy[key].some(x => typeof x !== 'string' || x.length === 0))) {
        errors.push(`policy.${key} must be an array of non-empty strings`);
      }
    }
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export const validatePolicyStructure = validatePolicy;

export function validateEvidenceEvent(event) {
  const errors = [];
  if (!isObject(event)) errors.push('event must be an object');
  if (isObject(event)) {
    if (!Number.isInteger(event.index) || event.index < 1) errors.push('event.index must be a positive integer');
    if (typeof event.timestamp !== 'string') errors.push('event.timestamp is required');
    const action = validateActionEnvelope(event.action);
    if (!action.valid) errors.push(...action.errors.map(e => `event.action.${e}`));
    if (!isObject(event.decision) || !DECISIONS.includes(event.decision.action)) errors.push('event.decision.action is invalid');
    if (typeof event.previousHash !== 'string') errors.push('event.previousHash is required');
    if (typeof event.hash !== 'string') errors.push('event.hash is required');
  }
  return { valid: errors.length === 0, errors, isValid: errors.length === 0, errorMessage: errors.join('; ') };
}

export function loadJsonLines(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid JSONL line ${i + 1}: ${error.message}`); }
  });
}
