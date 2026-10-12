/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

export const INTENT_MANIFEST_VERSIONS = Object.freeze(['0.1']);
export const INTENT_ENTITY_COLLECTIONS = Object.freeze([
  'capabilities', 'goals', 'scenarios', 'invariants', 'constraints', 'budgets',
  'authorities', 'dependencies', 'risks', 'failure_modes', 'fallbacks',
  'evidence_requirements', 'claims', 'decisions', 'incidents'
]);
export const INTENT_EVIDENCE_TYPES = Object.freeze([
  'static', 'unit', 'integration', 'property', 'build', 'runtime', 'device', 'external', 'manual'
]);
export const INTENT_RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);
export const INTENT_DECISION_STATUSES = Object.freeze(['proposed', 'accepted', 'superseded']);
export const INTENT_INCIDENT_STATUSES = Object.freeze(['open', 'resolved']);
export const INTENT_AUTHORITY_KINDS = Object.freeze(['design_source', 'state_source', 'decision_owner', 'external_contract']);
export const INTENT_DEPENDENCY_TYPES = Object.freeze(['required', 'optional', 'data', 'control', 'behavior']);
export const INTENT_BUDGET_OPERATORS = Object.freeze(['max', 'min', 'exact', 'range']);
export const INTENT_CONSTRAINT_TYPES = Object.freeze(['functional', 'non_functional', 'privacy', 'security', 'compatibility', 'platform', 'operational']);

const ID_RE = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const EXTENSION_KEY_RE = /^[A-Za-z][A-Za-z0-9-]*(?:[.:][A-Za-z0-9-]+)+$/;
const COMMON_FIELDS = new Set(['id', 'name', 'summary', 'tags', 'extensions']);
const COLLECTION_KIND = Object.freeze({
  capabilities: 'capability', goals: 'goal', scenarios: 'scenario', invariants: 'invariant',
  constraints: 'constraint', budgets: 'budget', authorities: 'authority', dependencies: 'dependency',
  risks: 'risk', failure_modes: 'failure_mode', fallbacks: 'fallback',
  evidence_requirements: 'evidence_requirement', claims: 'claim', decisions: 'decision', incidents: 'incident'
});
const KIND_COLLECTION = Object.freeze(Object.fromEntries(Object.entries(COLLECTION_KIND).map(([collection, kind]) => [kind, collection])));
const ALLOWED_FIELDS = Object.freeze({
  capability: new Set([...COMMON_FIELDS, 'goal_ids', 'dependency_ids', 'invariant_ids', 'constraint_ids', 'budget_ids', 'authority_ids', 'risk_ids', 'failure_mode_ids', 'fallback_ids', 'evidence_requirement_ids']),
  goal: new Set([...COMMON_FIELDS, 'statement', 'capability_ids']),
  scenario: new Set([...COMMON_FIELDS, 'given', 'when', 'then', 'capability_ids', 'invariant_ids']),
  invariant: new Set([...COMMON_FIELDS, 'statement', 'capability_ids']),
  constraint: new Set([...COMMON_FIELDS, 'statement', 'constraint_type', 'capability_ids']),
  budget: new Set([...COMMON_FIELDS, 'metric', 'operator', 'value', 'min_value', 'max_value', 'unit', 'capability_ids']),
  authority: new Set([...COMMON_FIELDS, 'statement', 'authority_kind', 'source', 'capability_ids']),
  dependency: new Set([...COMMON_FIELDS, 'from_capability_id', 'to_capability_id', 'dependency_type', 'statement']),
  risk: new Set([...COMMON_FIELDS, 'statement', 'severity', 'capability_ids', 'invariant_ids']),
  failure_mode: new Set([...COMMON_FIELDS, 'statement', 'capability_ids', 'fallback_ids']),
  fallback: new Set([...COMMON_FIELDS, 'statement', 'capability_ids']),
  evidence_requirement: new Set([...COMMON_FIELDS, 'statement', 'evidence_types', 'capability_ids']),
  claim: new Set([...COMMON_FIELDS, 'statement', 'capability_ids', 'invariant_ids', 'evidence_requirement_ids']),
  decision: new Set([...COMMON_FIELDS, 'statement', 'status', 'capability_ids', 'supersedes_decision_ids']),
  incident: new Set([...COMMON_FIELDS, 'statement', 'status', 'capability_ids', 'invariant_ids', 'decision_ids'])
});
const REF_FIELDS = Object.freeze({
  capability: { goal_ids: 'goal', dependency_ids: 'dependency', invariant_ids: 'invariant', constraint_ids: 'constraint', budget_ids: 'budget', authority_ids: 'authority', risk_ids: 'risk', failure_mode_ids: 'failure_mode', fallback_ids: 'fallback', evidence_requirement_ids: 'evidence_requirement' },
  goal: { capability_ids: 'capability' },
  scenario: { capability_ids: 'capability', invariant_ids: 'invariant' },
  invariant: { capability_ids: 'capability' },
  constraint: { capability_ids: 'capability' },
  budget: { capability_ids: 'capability' },
  authority: { capability_ids: 'capability' },
  risk: { capability_ids: 'capability', invariant_ids: 'invariant' },
  failure_mode: { capability_ids: 'capability', fallback_ids: 'fallback' },
  fallback: { capability_ids: 'capability' },
  evidence_requirement: { capability_ids: 'capability' },
  claim: { capability_ids: 'capability', invariant_ids: 'invariant', evidence_requirement_ids: 'evidence_requirement' },
  decision: { capability_ids: 'capability', supersedes_decision_ids: 'decision' },
  incident: { capability_ids: 'capability', invariant_ids: 'invariant', decision_ids: 'decision' }
});
const ARRAY_SET_FIELDS = new Set([
  'tags', 'goal_ids', 'dependency_ids', 'invariant_ids', 'constraint_ids', 'budget_ids', 'authority_ids',
  'risk_ids', 'failure_mode_ids', 'fallback_ids', 'evidence_requirement_ids', 'capability_ids',
  'evidence_types', 'supersedes_decision_ids', 'decision_ids'
]);

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function result(errors, warnings = []) { return { valid: errors.length === 0, isValid: errors.length === 0, errors, warnings, errorMessage: errors.join('; ') }; }
function requireString(value, path, errors) { if (typeof value !== 'string' || value.trim().length === 0) errors.push(`${path} must be a non-empty string`); }
function optionalString(value, path, errors) { if (value !== undefined && typeof value !== 'string') errors.push(`${path} must be a string when present`); }
function validateId(value, path, errors) { if (typeof value !== 'string' || !ID_RE.test(value)) errors.push(`${path} must match ${ID_RE}`); }
function validateStringArray(value, path, errors, { nonEmpty = false } = {}) {
  if (value === undefined) return;
  if (!Array.isArray(value)) { errors.push(`${path} must be an array`); return; }
  if (nonEmpty && value.length === 0) errors.push(`${path} must not be empty`);
  const seen = new Set();
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.length === 0) errors.push(`${path}[${index}] must be a non-empty string`);
    else if (seen.has(item)) errors.push(`${path} contains duplicate value: ${item}`);
    else seen.add(item);
  });
}
function validateExtensions(value, path, errors) {
  if (value === undefined) return;
  if (!isObject(value)) { errors.push(`${path} must be an object`); return; }
  for (const key of Object.keys(value)) if (!EXTENSION_KEY_RE.test(key)) errors.push(`${path}.${key} must use a namespaced extension key`);
}
function validateCommon(entity, kind, path, errors) {
  if (!isObject(entity)) { errors.push(`${path} must be an object`); return false; }
  for (const key of Object.keys(entity)) if (!ALLOWED_FIELDS[kind].has(key)) errors.push(`${path}.${key} is not supported by Intent IR 0.1`);
  validateId(entity.id, `${path}.id`, errors);
  optionalString(entity.name, `${path}.name`, errors);
  optionalString(entity.summary, `${path}.summary`, errors);
  validateStringArray(entity.tags, `${path}.tags`, errors);
  validateExtensions(entity.extensions, `${path}.extensions`, errors);
  return true;
}
function validateStatement(entity, path, errors) { requireString(entity.statement, `${path}.statement`, errors); }
function validateRefsShape(entity, kind, path, errors) { for (const field of Object.keys(REF_FIELDS[kind] || {})) validateStringArray(entity[field], `${path}.${field}`, errors); }
function validateEntitySpecific(entity, kind, path, errors) {
  switch (kind) {
    case 'goal': case 'invariant': case 'risk': case 'failure_mode': case 'fallback': case 'evidence_requirement': case 'claim': case 'decision': case 'incident': validateStatement(entity, path, errors); break;
    case 'constraint': validateStatement(entity, path, errors); if (!INTENT_CONSTRAINT_TYPES.includes(entity.constraint_type)) errors.push(`${path}.constraint_type is invalid`); break;
    case 'scenario':
      for (const field of ['given', 'when', 'then']) validateStringArray(entity[field], `${path}.${field}`, errors, { nonEmpty: true });
      break;
    case 'budget':
      requireString(entity.metric, `${path}.metric`, errors);
      if (!INTENT_BUDGET_OPERATORS.includes(entity.operator)) errors.push(`${path}.operator is invalid`);
      optionalString(entity.unit, `${path}.unit`, errors);
      if (entity.operator === 'range') {
        if (typeof entity.min_value !== 'number' || !Number.isFinite(entity.min_value)) errors.push(`${path}.min_value must be a finite number for range budgets`);
        if (typeof entity.max_value !== 'number' || !Number.isFinite(entity.max_value)) errors.push(`${path}.max_value must be a finite number for range budgets`);
        if (Number.isFinite(entity.min_value) && Number.isFinite(entity.max_value) && entity.min_value > entity.max_value) errors.push(`${path}.min_value must not exceed max_value`);
        if (entity.value !== undefined) errors.push(`${path}.value is not allowed for range budgets`);
      } else if (typeof entity.value !== 'number' || !Number.isFinite(entity.value)) errors.push(`${path}.value must be a finite number for ${entity.operator || 'non-range'} budgets`);
      break;
    case 'authority':
      validateStatement(entity, path, errors);
      if (!INTENT_AUTHORITY_KINDS.includes(entity.authority_kind)) errors.push(`${path}.authority_kind is invalid`);
      requireString(entity.source, `${path}.source`, errors);
      break;
    case 'dependency':
      validateId(entity.from_capability_id, `${path}.from_capability_id`, errors);
      validateId(entity.to_capability_id, `${path}.to_capability_id`, errors);
      if (entity.from_capability_id === entity.to_capability_id) errors.push(`${path} must not depend on the same capability`);
      if (!INTENT_DEPENDENCY_TYPES.includes(entity.dependency_type)) errors.push(`${path}.dependency_type is invalid`);
      optionalString(entity.statement, `${path}.statement`, errors);
      break;
    default: break;
  }
  if (kind === 'risk' && !INTENT_RISK_LEVELS.includes(entity.severity)) errors.push(`${path}.severity is invalid`);
  if (kind === 'decision' && !INTENT_DECISION_STATUSES.includes(entity.status)) errors.push(`${path}.status is invalid`);
  if (kind === 'incident' && !INTENT_INCIDENT_STATUSES.includes(entity.status)) errors.push(`${path}.status is invalid`);
  if (kind === 'evidence_requirement') {
    validateStringArray(entity.evidence_types, `${path}.evidence_types`, errors, { nonEmpty: true });
    for (const value of entity.evidence_types || []) if (!INTENT_EVIDENCE_TYPES.includes(value)) errors.push(`${path}.evidence_types contains invalid value: ${value}`);
  }
  validateRefsShape(entity, kind, path, errors);
}
function validateProduct(product, errors) {
  if (!isObject(product)) { errors.push('product must be an object'); return; }
  const allowed = new Set(['id', 'name', 'summary', 'version', 'extensions']);
  for (const key of Object.keys(product)) if (!allowed.has(key)) errors.push(`product.${key} is not supported by Intent IR 0.1`);
  validateId(product.id, 'product.id', errors);
  requireString(product.name, 'product.name', errors);
  optionalString(product.summary, 'product.summary', errors);
  optionalString(product.version, 'product.version', errors);
  validateExtensions(product.extensions, 'product.extensions', errors);
}
function allEntityEntries(manifest) {
  return INTENT_ENTITY_COLLECTIONS.flatMap(collection => (manifest[collection] || []).map((entity, index) => ({ collection, kind: COLLECTION_KIND[collection], entity, index })));
}
function referenceValues(entity, kind) {
  const refs = [];
  for (const [field, targetKind] of Object.entries(REF_FIELDS[kind] || {})) for (const id of entity[field] || []) refs.push({ field, id, targetKind });
  if (kind === 'dependency') {
    refs.push({ field: 'from_capability_id', id: entity.from_capability_id, targetKind: 'capability' });
    refs.push({ field: 'to_capability_id', id: entity.to_capability_id, targetKind: 'capability' });
  }
  return refs;
}

export function validateIntentManifest(manifest) {
  const errors = [], warnings = [];
  if (!isObject(manifest)) return result(['intent manifest must be an object']);
  const allowedTop = new Set(['intent_manifest_version', 'manifest_id', 'product', ...INTENT_ENTITY_COLLECTIONS, 'extensions']);
  for (const key of Object.keys(manifest)) if (!allowedTop.has(key)) errors.push(`${key} is not supported by Intent IR 0.1`);
  if (!INTENT_MANIFEST_VERSIONS.includes(manifest.intent_manifest_version)) errors.push(`intent_manifest_version must be one of: ${INTENT_MANIFEST_VERSIONS.join(', ')}`);
  validateId(manifest.manifest_id, 'manifest_id', errors);
  validateProduct(manifest.product, errors);
  validateExtensions(manifest.extensions, 'extensions', errors);
  for (const collection of INTENT_ENTITY_COLLECTIONS) if (manifest[collection] !== undefined && !Array.isArray(manifest[collection])) errors.push(`${collection} must be an array when present`);
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) errors.push('capabilities must be a non-empty array');

  const registry = new Map();
  if (isObject(manifest.product) && typeof manifest.product.id === 'string') registry.set(manifest.product.id, { kind: 'product', path: 'product.id' });
  if (typeof manifest.manifest_id === 'string') {
    if (registry.has(manifest.manifest_id)) errors.push(`duplicate global id: ${manifest.manifest_id}`);
    else registry.set(manifest.manifest_id, { kind: 'manifest', path: 'manifest_id' });
  }
  for (const { collection, kind, entity, index } of allEntityEntries(manifest)) {
    const path = `${collection}[${index}]`;
    if (!validateCommon(entity, kind, path, errors)) continue;
    validateEntitySpecific(entity, kind, path, errors);
    if (typeof entity.id === 'string') {
      if (registry.has(entity.id)) errors.push(`duplicate global id: ${entity.id} (${registry.get(entity.id).path} and ${path}.id)`);
      else registry.set(entity.id, { kind, path: `${path}.id` });
    }
  }
  for (const { collection, kind, entity, index } of allEntityEntries(manifest)) {
    if (!isObject(entity)) continue;
    const path = `${collection}[${index}]`;
    for (const ref of referenceValues(entity, kind)) {
      if (typeof ref.id !== 'string' || !ID_RE.test(ref.id)) continue;
      const target = registry.get(ref.id);
      if (!target) errors.push(`${path}.${ref.field} references unknown id: ${ref.id}`);
      else if (target.kind !== ref.targetKind) errors.push(`${path}.${ref.field} references ${ref.id} as ${ref.targetKind}, but it is ${target.kind}`);
    }
  }
  return result(errors, warnings);
}

function sortObject(value, key = '') {
  if (Array.isArray(value)) {
    const items = value.map(item => sortObject(item));
    if (ARRAY_SET_FIELDS.has(key) && items.every(item => typeof item === 'string')) return items.sort();
    if (INTENT_ENTITY_COLLECTIONS.includes(key) && items.every(item => isObject(item) && typeof item.id === 'string')) return items.sort((a, b) => a.id.localeCompare(b.id));
    return items;
  }
  if (!isObject(value)) return value;
  const out = {};
  for (const k of Object.keys(value).sort()) out[k] = sortObject(value[k], k);
  return out;
}

export function normalizeIntentManifest(manifest) {
  if (!isObject(manifest)) return manifest;
  const out = JSON.parse(JSON.stringify(manifest));
  for (const collection of INTENT_ENTITY_COLLECTIONS) if (!Array.isArray(out[collection])) out[collection] = [];
  return sortObject(out);
}

export function canonicalIntentJson(manifest) {
  const normalized = normalizeIntentManifest(manifest);
  const encode = value => {
    if (Array.isArray(value)) return `[${value.map(encode).join(',')}]`;
    if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${encode(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  };
  return encode(normalized);
}

export function summarizeIntentManifest(manifest) {
  const validation = validateIntentManifest(manifest);
  const counts = Object.fromEntries(INTENT_ENTITY_COLLECTIONS.map(collection => [collection, Array.isArray(manifest?.[collection]) ? manifest[collection].length : 0]));
  return {
    intent_manifest_version: manifest?.intent_manifest_version ?? null,
    manifest_id: manifest?.manifest_id ?? null,
    product_id: manifest?.product?.id ?? null,
    product_name: manifest?.product?.name ?? null,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    counts
  };
}

export function intentEntityCollectionForKind(kind) { return KIND_COLLECTION[kind] || null; }
