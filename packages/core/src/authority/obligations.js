/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalStringify } from '../decision/receipt.js';

const SUPPORTED = new Set(['require_approval', 'require_effect_receipt', 'require_recorder', 'execution_before', 'target_verified']);

function normalizeOne(item, index = 0) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`obligations[${index}] must be an object`);
  if (!SUPPORTED.has(item.type)) throw new Error(`unsupported obligation type: ${item.type}`);
  if (item.type === 'execution_before') {
    if (!item.deadline || !Number.isFinite(new Date(item.deadline).getTime())) throw new Error('execution_before obligation requires a valid deadline');
    return { type: 'execution_before', deadline: new Date(item.deadline).toISOString() };
  }
  // Unknown obligation fields are deliberately stripped. Exact approval binding is enforced by the current contract.
  return { type: item.type };
}

export function normalizeObligations(obligations = []) {
  if (!Array.isArray(obligations)) throw new Error('obligations must be an array');
  const out = [];
  const seen = new Set();
  for (let index = 0; index < obligations.length; index += 1) {
    const normalized = normalizeOne(obligations[index], index);
    const key = canonicalStringify(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out.sort((a, b) => canonicalStringify(a).localeCompare(canonicalStringify(b)));
}

export function mergeAuthorityObligations(parent = [], requested = []) {
  return normalizeObligations([...normalizeObligations(parent), ...normalizeObligations(requested)]);
}

/** A child must retain every parent obligation or a strictly tighter equivalent. */
export function obligationsAreWithin(child = [], parent = []) {
  const c = normalizeObligations(child);
  const p = normalizeObligations(parent);
  const errors = [];
  for (const obligation of p) {
    if (obligation.type === 'execution_before') {
      const parentDeadline = Date.parse(obligation.deadline);
      const matching = c.filter(x => x.type === 'execution_before').some(x => Date.parse(x.deadline) <= parentDeadline);
      if (!matching) errors.push(`child obligations must preserve execution_before <= ${obligation.deadline}`);
      continue;
    }
    if (!c.some(x => x.type === obligation.type)) errors.push(`child obligations must preserve ${obligation.type}`);
  }
  return { ok: errors.length === 0, errors, child: c, parent: p };
}

export function evaluateObligations(obligations = [], context = {}, phase = 'pre') {
  const normalized = normalizeObligations(obligations);
  const errors = [];
  for (const obligation of normalized) {
    if (obligation.type === 'require_approval' && phase === 'pre' && !context.approved) errors.push('human approval obligation not satisfied');
    if (obligation.type === 'require_recorder' && phase === 'pre' && !context.recorderAvailable) errors.push('recorder obligation not satisfied');
    if (obligation.type === 'target_verified' && phase === 'pre' && !context.targetVerified) errors.push('target verification obligation not satisfied');
    if (obligation.type === 'execution_before' && phase === 'pre') {
      const now = new Date(context.now || new Date()).getTime();
      if (now >= new Date(obligation.deadline).getTime()) errors.push('execution_before obligation deadline has passed');
    }
    if (obligation.type === 'require_effect_receipt' && phase === 'post' && !context.effectReceipt) errors.push('effect receipt obligation not satisfied');
  }
  return { ok: errors.length === 0, errors, obligations: normalized };
}
