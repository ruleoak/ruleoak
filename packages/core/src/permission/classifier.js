/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { containsSecretLike } from './redactor.js';

export const RISK_LEVELS = Object.freeze(['safe', 'low', 'medium', 'high', 'critical']);
export const DATA_FLOWS = Object.freeze(['local', 'external', 'unknown']);
export const SIDE_EFFECTS = Object.freeze(['read_only', 'mutating', 'destructive', 'unknown']);

export const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(the\s+)?system\s+prompt/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /send\s+.*secret/i,
  /exfiltrate/i,
  /bypass\s+(the\s+)?(safety|policy|permission)/i,
  /do\s+not\s+ask\s+(the\s+)?user/i
];

const RISK_RANK = { safe: 0, low: 1, medium: 2, high: 3, critical: 4 };
const READ_ONLY_OPERATIONS = new Set(['read', 'search', 'list', 'get']);
const DESTRUCTIVE_OPERATIONS = new Set(['delete', 'remove', 'destroy']);
const EXTERNAL_CATEGORIES = new Set(['email', 'web', 'payment', 'calendar']);

export function maxRisk(...levels) {
  return levels.filter(Boolean).reduce((best, level) => RISK_RANK[level] > RISK_RANK[best] ? level : best, 'safe');
}

function stringifyForHeuristics(value) {
  try { return JSON.stringify(value ?? ''); }
  catch { return String(value ?? ''); }
}

export function containsPromptInjection(value) {
  const text = stringifyForHeuristics(value);
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

export function splitActionType(actionType = '') {
  const [category = 'custom', operation = 'execute'] = String(actionType).split('.');
  return { category, operation };
}

export function classifyDataFlow(normalizedCall = {}) {
  const category = normalizedCall.tool?.category || 'custom';
  const operation = normalizedCall.tool?.operation || 'execute';
  const scope = String(normalizedCall.target?.scope || '').toLowerCase();
  if (operation === 'send' || EXTERNAL_CATEGORIES.has(category) || /external|remote|network|internet|cloud|third[-_ ]?party/.test(scope)) return 'external';
  if (['file', 'filesystem', 'shell', 'memory'].includes(category) || /local|workspace|device|host|process/.test(scope)) return 'local';
  return 'unknown';
}

export function classifySideEffect(normalizedCall = {}) {
  const operation = normalizedCall.tool?.operation || 'execute';
  if (READ_ONLY_OPERATIONS.has(operation)) return 'read_only';
  if (DESTRUCTIVE_OPERATIONS.has(operation)) return 'destructive';
  if (['write', 'update', 'create', 'send', 'execute', 'run'].includes(operation)) return 'mutating';
  return 'unknown';
}

export function classifyRisk(normalizedCall) {
  const reasons = [];
  const toolName = normalizedCall?.tool?.name || '';
  const category = normalizedCall?.tool?.category || splitActionType(toolName).category;
  const operation = normalizedCall?.tool?.operation || splitActionType(toolName).operation;
  const sensitivity = normalizedCall?.target?.sensitivity || 'unknown';
  const args = normalizedCall?.arguments || {};
  const dataFlow = classifyDataFlow(normalizedCall);
  const sideEffect = classifySideEffect(normalizedCall);
  let risk = 'safe';

  if (category === 'file' || category === 'filesystem') {
    if (operation === 'read') {
      risk = sensitivity === 'public' ? maxRisk(risk, 'safe') : sensitivity === 'private' || sensitivity === 'secret' ? maxRisk(risk, 'medium') : maxRisk(risk, 'low');
      reasons.push(sensitivity === 'public' ? 'read-only public resource' : `read-only ${sensitivity} resource access`);
    } else if (['write', 'update', 'create'].includes(operation)) {
      risk = maxRisk(risk, 'medium');
      reasons.push('local file modification');
    } else if (operation === 'delete') {
      risk = maxRisk(risk, sensitivity === 'private' || sensitivity === 'secret' ? 'critical' : 'high');
      reasons.push('destructive file operation');
    }
  }

  if (category === 'email' || operation === 'send') {
    risk = maxRisk(risk, 'high');
    reasons.push('external communication');
  }

  if (category === 'shell' || operation === 'execute' || operation === 'run') {
    risk = maxRisk(risk, 'high');
    reasons.push('local command execution');
  }

  if (category === 'payment') {
    risk = maxRisk(risk, 'critical');
    reasons.push('payment-like side effect');
  }

  if (sensitivity === 'private') {
    risk = maxRisk(risk, 'medium');
    reasons.push('private resource');
  }

  if (sensitivity === 'secret') {
    risk = maxRisk(risk, dataFlow === 'external' ? 'critical' : 'high');
    reasons.push(dataFlow === 'external' ? 'secret crossing an external boundary' : 'secret resource handled locally');
  }

  const detectedSecrets = containsSecretLike(args) || containsSecretLike(normalizedCall?.target?.resource || '');
  const secretExfiltrationRisk = detectedSecrets && dataFlow === 'external';
  if (detectedSecrets) {
    risk = maxRisk(risk, secretExfiltrationRisk ? 'critical' : 'high');
    reasons.push(secretExfiltrationRisk ? 'credential-like secret may leave the local trust boundary' : 'credential-like secret detected in a local or unknown flow');
  }

  const detectedPromptInjection = containsPromptInjection(args) || containsPromptInjection(normalizedCall?.context || {});
  const promptInjectionSideEffectRisk = detectedPromptInjection && (sideEffect !== 'read_only' || dataFlow === 'external');
  if (detectedPromptInjection) {
    risk = maxRisk(risk, promptInjectionSideEffectRisk ? 'critical' : 'high');
    reasons.push(promptInjectionSideEffectRisk ? 'prompt-injection-like instruction combined with a side effect' : 'prompt-injection-like content detected in a read-only flow');
  }

  if (dataFlow === 'unknown' && sideEffect !== 'read_only') {
    risk = maxRisk(risk, 'medium');
    reasons.push('unknown trust-boundary direction');
  }

  if (reasons.length === 0) {
    risk = maxRisk(risk, 'medium');
    reasons.push('unknown tool action');
  }

  return {
    risk,
    reasons: [...new Set(reasons)],
    detectedSecrets,
    detectedPromptInjection,
    secretExfiltrationRisk,
    promptInjectionSideEffectRisk,
    dataFlow,
    sideEffect,
    untrustedInput: detectedPromptInjection
  };
}
