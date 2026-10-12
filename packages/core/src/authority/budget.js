/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonicalStringify } from '../decision/receipt.js';
import { createHash } from 'node:crypto';
import { withFileLock } from '../io/file-lock.js';
import { atomicWriteFileSync, readBoundedFileSync } from '../io/durable-file.js';

export const AUTHORITY_BUDGET_FIELDS = Object.freeze(['max_executions', 'max_objects', 'max_bytes', 'max_amount', 'max_external_calls']);
export const DELEGATION_BUDGET_REGISTRY_LIMITS = Object.freeze({ maxBytes: 8 * 1024 * 1024, maxLineBytes: 64 * 1024, maxRecords: 50_000 });

function finiteBoundedNumber(value, label, integer = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || Math.abs(n) > Number.MAX_SAFE_INTEGER) throw new Error(`${label} must be a non-negative finite safe number`);
  if (integer && !Number.isSafeInteger(n)) throw new Error(`${label} must be a safe integer`);
  return n;
}

export function normalizeAuthorityBudget(input = {}) {
  const output = {};
  for (const field of AUTHORITY_BUDGET_FIELDS) {
    if (input[field] === undefined || input[field] === null) continue;
    output[field] = finiteBoundedNumber(input[field], field, field !== 'max_amount');
  }
  return output;
}

export function budgetIsWithin(child = {}, parent = {}) {
  const errors = [];
  const c = normalizeAuthorityBudget(child);
  const p = normalizeAuthorityBudget(parent);
  for (const field of AUTHORITY_BUDGET_FIELDS) {
    if (p[field] !== undefined && c[field] === undefined) { errors.push(`${field} omits parent-limited budget`); continue; }
    if (c[field] !== undefined && p[field] !== undefined && c[field] > p[field]) errors.push(`${field} exceeds parent budget`);
  }
  return { ok: errors.length === 0, errors, child: c, parent: p };
}

export function inheritAuthorityBudget(parent = {}, requested = {}) {
  const p = normalizeAuthorityBudget(parent);
  const r = normalizeAuthorityBudget(requested);
  const merged = { ...p, ...r };
  const check = budgetIsWithin(merged, p);
  if (!check.ok) throw new Error(`delegated budget exceeds parent: ${check.errors.join('; ')}`);
  return merged;
}

export function addAuthorityBudgets(left = {}, right = {}) {
  const a = normalizeAuthorityBudget(left);
  const b = normalizeAuthorityBudget(right);
  const out = {};
  for (const field of AUTHORITY_BUDGET_FIELDS) {
    if (a[field] === undefined && b[field] === undefined) continue;
    const value = Number(a[field] || 0) + Number(b[field] || 0);
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || (field !== 'max_amount' && !Number.isSafeInteger(value))) throw new Error(`${field} budget addition exceeds safe numeric range`);
    out[field] = value;
  }
  return out;
}

export function evaluateAuthorityBudget(budget = {}, usage = {}) {
  const normalized = normalizeAuthorityBudget(budget);
  const errors = [];
  const mappings = { max_executions: 'executions', max_objects: 'objects', max_bytes: 'bytes', max_amount: 'amount', max_external_calls: 'external_calls' };
  for (const [maxField, useField] of Object.entries(mappings)) {
    if (normalized[maxField] === undefined || usage[useField] === undefined) continue;
    let used;
    try { used = finiteBoundedNumber(usage[useField], `${useField} usage`, maxField !== 'max_amount'); }
    catch { errors.push(`${useField} usage is invalid`); continue; }
    if (used > normalized[maxField]) errors.push(`${useField} usage ${used} exceeds ${maxField} ${normalized[maxField]}`);
  }
  return { ok: errors.length === 0, errors, budget: normalized, usage: { ...usage } };
}

function allocationDigest(record) {
  const { allocation_id: _ignored, ...payload } = record;
  return `sha256:${createHash('sha256').update(canonicalStringify(payload)).digest('hex')}`;
}

export class DelegationBudgetRegistry {
  constructor(options = {}) {
    this.filePath = options.filePath || null;
    this.records = [];
    this.limits = { ...DELEGATION_BUDGET_REGISTRY_LIMITS, ...(options.limits || {}) };
  }

  _loadUnlocked() {
    if (!this.filePath) return this.records.map(r => structuredClone(r));
    if (!existsSync(this.filePath)) return [];
    const text = readBoundedFileSync(this.filePath, { maxBytes: this.limits.maxBytes, label: 'delegation budget registry' });
    const lines = String(text || '').split(/\r?\n/).filter(Boolean);
    if (lines.length > this.limits.maxRecords) throw new Error(`delegation budget registry exceeds maxRecords (${this.limits.maxRecords})`);
    const records = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (Buffer.byteLength(lines[i], 'utf8') > this.limits.maxLineBytes) throw new Error(`delegation budget registry line ${i + 1} exceeds maxLineBytes (${this.limits.maxLineBytes})`);
      let record;
      try { record = JSON.parse(lines[i]); } catch { throw new Error(`corrupt delegation budget registry JSON at line ${i + 1}`); }
      if (record?.allocation_version !== '1.0') throw new Error(`invalid delegation budget registry version at line ${i + 1}`);
      if (typeof record.parent_grant_id !== 'string' || !record.parent_grant_id) throw new Error(`invalid parent_grant_id at line ${i + 1}`);
      if (typeof record.child_grant_id !== 'string' || !record.child_grant_id) throw new Error(`invalid child_grant_id at line ${i + 1}`);
      normalizeAuthorityBudget(record.budget || {});
      if (record.allocation_id !== allocationDigest(record)) throw new Error(`delegation budget allocation digest mismatch at line ${i + 1}`);
      records.push(record);
    }
    return records;
  }

  _persistUnlocked(records) {
    if (!this.filePath) { this.records = records.map(r => structuredClone(r)); return; }
    if (records.length > this.limits.maxRecords) throw new Error(`delegation budget registry exceeds maxRecords (${this.limits.maxRecords})`);
    const text = records.length ? records.map(record => JSON.stringify(record)).join('\n') + '\n' : '';
    atomicWriteFileSync(this.filePath, text, { mode: 0o600, maxBytes: this.limits.maxBytes, label: 'delegation budget registry' });
  }

  list() {
    if (!this.filePath) return this._loadUnlocked();
    if (!existsSync(this.filePath)) return [];
    return withFileLock(this.filePath, () => this._loadUnlocked());
  }

  reserve(parentGrant, childGrant, options = {}) {
    if (!parentGrant?.grant_id || !childGrant?.grant_id) throw new Error('parent and child grant IDs are required for budget allocation');
    const parentBudget = normalizeAuthorityBudget(parentGrant.budget || {});
    const childBudget = normalizeAuthorityBudget(childGrant.budget || {});
    const check = budgetIsWithin(childBudget, parentBudget);
    if (!check.ok) throw new Error(`delegated partition budget exceeds parent: ${check.errors.join('; ')}`);
    const perform = () => {
      const existing = this._loadUnlocked();
      const sameChild = existing.find(r => r.parent_grant_id === parentGrant.grant_id && r.child_grant_id === childGrant.grant_id);
      if (sameChild) {
        if (canonicalStringify(sameChild.budget) !== canonicalStringify(childBudget)) throw new Error('delegation budget allocation conflicts with existing child allocation');
        return { reserved: false, duplicate: true, record: structuredClone(sameChild) };
      }
      const used = {};
      for (const record of existing.filter(r => r.parent_grant_id === parentGrant.grant_id)) Object.assign(used, addAuthorityBudgets(used, record.budget || {}));
      const projected = addAuthorityBudgets(used, childBudget);
      for (const field of AUTHORITY_BUDGET_FIELDS) if (parentBudget[field] !== undefined && Number(projected[field] || 0) > parentBudget[field]) throw new Error(`${field} partition allocation exceeds remaining parent budget`);
      const allocatedAt = new Date(options.allocatedAt || options.now || new Date());
      if (!Number.isFinite(allocatedAt.getTime())) throw new Error('delegation budget allocatedAt must be a valid date-time');
      const payload = { allocation_version: '1.0', parent_grant_id: parentGrant.grant_id, child_grant_id: childGrant.grant_id, budget: childBudget, allocated_at: allocatedAt.toISOString() };
      const record = { ...payload, allocation_id: allocationDigest(payload) };
      this._persistUnlocked([...existing, record]);
      return { reserved: true, duplicate: false, record: structuredClone(record) };
    };
    if (this.filePath) mkdirSync(dirname(this.filePath), { recursive: true, mode: 0o700 });
    return this.filePath ? withFileLock(this.filePath, perform) : perform();
  }
}
