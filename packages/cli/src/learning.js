/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { atomicWriteFileSync, readBoundedFileSync } from './io/durable-file.js';
import { dirname, resolve } from 'node:path';
import { approvalFingerprint } from '@ruleoak/core';

function ensurePrivateDir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') chmodSync(path, 0o700);
}

function writeJson(path, value) {
  ensurePrivateDir(dirname(path));
  atomicWriteFileSync(path, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, maxBytes: 2 * 1024 * 1024, label: 'learning state' });
}

function safe(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 96);
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

export function learningDir(baseDir) { return resolve(baseDir, '.ruleoak', 'learning'); }
export function learningSessionsDir(baseDir) { return resolve(learningDir(baseDir), 'sessions'); }
export function learningSuggestionsDir(baseDir) { return resolve(learningDir(baseDir), 'suggestions'); }

function readJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const names=readdirSync(dir).filter(name => name.endsWith('.json')).sort();
  if(names.length>10_000) throw new Error('learning state exceeds max JSON files (10000)');
  return names.map(name => {
    try { return JSON.parse(readBoundedFileSync(resolve(dir, name), { maxBytes: 2 * 1024 * 1024, label: 'learning state' })); }
    catch { return null; }
  }).filter(Boolean);
}

function commonResourcePattern(resources) {
  const unique = [...new Set(resources.filter(Boolean).map(String))];
  if (unique.length < 2) return unique[0] || '*';
  let prefix = unique[0];
  for (const resource of unique.slice(1)) {
    while (prefix && !resource.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const slash = Math.max(prefix.lastIndexOf('/'), prefix.lastIndexOf('\\'));
  if (slash <= 0) return '*';
  return `${prefix.slice(0, slash + 1)}**`;
}

function effectForObservation(group) {
  if (group.critical || group.hardBlock || group.decisions.deny > 0) return 'deny';
  if (group.decisions.needs_approval > 0) return 'needs_approval';
  return 'allow';
}

function generalizationRisk(group, resourcePattern) {
  if (resourcePattern === '*') return { level: 'high', reason: 'The candidate would cover every resource for this action' };
  if (group.resources.length > 5) return { level: 'medium', reason: `The candidate groups ${group.resources.length} distinct resources` };
  return { level: 'low', reason: 'The candidate is limited to a shared resource prefix and matching context' };
}

export class LearningSession {
  constructor(baseDir, options = {}) {
    this.baseDir = resolve(baseDir);
    this.sessionId = options.sessionId || `learn_${randomUUID()}`;
    this.startedAt = options.startedAt || new Date().toISOString();
    this.observations = [];
    this.groups = new Map();
    ensurePrivateDir(learningSessionsDir(this.baseDir));
    ensurePrivateDir(learningSuggestionsDir(this.baseDir));
  }

  observe(result, metadata = {}) {
    if (!result?.normalizedCall || !result?.decision) return;
    const call = result.normalizedCall;
    const exactKey = approvalFingerprint(call);
    const generalizedKey = [
      call.tool?.name,
      call.tool?.category,
      call.tool?.operation,
      result.classification?.dataFlow,
      result.classification?.sideEffect,
      call.target?.sensitivity
    ].join('|');
    const observation = {
      observed_at: metadata.observedAt || new Date().toISOString(),
      call_id: call.call_id,
      exact_key: exactKey,
      generalized_key: generalizedKey,
      tool: call.tool,
      target: call.target,
      risk: result.classification?.risk || 'unknown',
      data_flow: result.classification?.dataFlow || 'unknown',
      side_effect: result.classification?.sideEffect || 'unknown',
      decision: result.decision.action,
      matched_rule: result.decision.matchedRule || null,
      reason: result.decision.reason || '',
      critical_hard_block: result.classification?.risk === 'critical' && result.decision.action === 'deny'
    };
    this.observations.push(observation);
    const current = this.groups.get(generalizedKey) || {
      key: generalizedKey,
      tool: call.tool,
      sensitivity: call.target?.sensitivity || 'unknown',
      dataFlow: observation.data_flow,
      sideEffect: observation.side_effect,
      resources: [],
      exactKeys: [],
      risks: [],
      decisions: { allow: 0, deny: 0, needs_approval: 0, dry_run_only: 0 },
      critical: false,
      hardBlock: false,
      count: 0
    };
    current.count += 1;
    current.resources = [...new Set([...current.resources, call.target?.resource || ''])];
    current.exactKeys = [...new Set([...current.exactKeys, exactKey])];
    current.risks = [...new Set([...current.risks, observation.risk])];
    current.decisions[observation.decision] = (current.decisions[observation.decision] || 0) + 1;
    current.critical ||= observation.risk === 'critical';
    current.hardBlock ||= observation.critical_hard_block;
    this.groups.set(generalizedKey, current);
  }

  finalize(options = {}) {
    const endedAt = options.endedAt || new Date().toISOString();
    const suggestions = [];
    for (const group of this.groups.values()) {
      const effect = effectForObservation(group);
      for (const [index, exactKey] of group.exactKeys.entries()) {
        const target = group.resources[index] || group.resources[0] || '*';
        const id = `learn_exact_${digest([this.sessionId, exactKey])}`;
        suggestions.push({
          learning_suggestion_version: '1.0',
          suggestion_id: id,
          session_id: this.sessionId,
          kind: 'exact_action',
          status: 'review_required',
          created_at: endedAt,
          effect,
          critical_guard_preserved: group.critical || group.hardBlock,
          rule_candidate: {
            collection: 'exactActionRules',
            value: {
              id: `exact_${safe(id)}`,
              effect,
              decision_key: exactKey,
              tool: group.tool?.name || '',
              target,
              allowCritical: false,
              source_learning_suggestion_id: id,
              created_at: endedAt
            }
          },
          explanation: effect === 'allow'
            ? 'Exact-action allow candidate. It covers only the observed action fingerprint and is never applied automatically.'
            : `Exact-action ${effect} candidate derived from observed decisions.`,
          expansion_risk: { level: 'low', reason: 'Exact-action fingerprint only' }
        });
      }
      if (group.count >= 2 && group.resources.length >= 2) {
        const resourcePattern = commonResourcePattern(group.resources);
        const risk = generalizationRisk(group, resourcePattern);
        const id = `learn_general_${digest([this.sessionId, group.key, resourcePattern])}`;
        suggestions.push({
          learning_suggestion_version: '1.0',
          suggestion_id: id,
          session_id: this.sessionId,
          kind: 'generalized',
          status: 'review_required',
          created_at: endedAt,
          effect: group.critical || group.hardBlock ? 'deny' : effect,
          critical_guard_preserved: group.critical || group.hardBlock,
          observations: group.count,
          observed_resources: group.resources,
          rule_candidate: {
            collection: 'rules',
            value: {
              id: `learned-${safe(group.tool?.name)}-${digest(resourcePattern)}`,
              description: `Learning-mode candidate from ${group.count} observed actions`,
              effect: group.critical || group.hardBlock ? 'deny' : effect,
              priority: effect === 'deny' ? 120 : effect === 'needs_approval' ? 70 : 30,
              actions: [group.tool?.name || '*'],
              resources: [resourcePattern],
              conditions: {
                categories: [group.tool?.category || 'custom'],
                operations: [group.tool?.operation || 'execute'],
                sensitivities: [group.sensitivity],
                dataFlows: [group.dataFlow],
                sideEffects: [group.sideEffect]
              },
              allowCritical: false
            }
          },
          explanation: 'Generalized candidate based on repeated equivalent actions. Review the expansion warning and resource pattern before applying.',
          expansion_risk: risk
        });
      }
    }

    for (const suggestion of suggestions) writeJson(resolve(learningSuggestionsDir(this.baseDir), `${safe(suggestion.suggestion_id)}.json`), suggestion);
    const summary = {
      learning_session_version: '1.0',
      session_id: this.sessionId,
      started_at: this.startedAt,
      ended_at: endedAt,
      observations: this.observations,
      groups: [...this.groups.values()],
      suggestion_ids: suggestions.map(item => item.suggestion_id),
      safety: {
        auto_applied: false,
        critical_hard_blocks_bypassed: false,
        note: 'Learning mode records and proposes. It never changes active policy automatically.'
      }
    };
    const path = resolve(learningSessionsDir(this.baseDir), `${safe(this.sessionId)}.json`);
    writeJson(path, summary);
    return { path, summary, suggestions };
  }
}


export function listLearningSessions(baseDir) {
  return readJsonFiles(learningSessionsDir(resolve(baseDir))).sort((a, b) => String(a.started_at || '').localeCompare(String(b.started_at || '')));
}

export function renderLearningSummary(baseDir) {
  const sessions = listLearningSessions(baseDir);
  const suggestions = listLearningSuggestions(baseDir);
  const counts = suggestions.reduce((acc, item) => {
    acc[item.status || 'unknown'] = (acc[item.status || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const observations = sessions.reduce((sum, session) => sum + (Array.isArray(session.observations) ? session.observations.length : 0), 0);
  const lines = [
    'RuleOak learning summary',
    '',
    `Sessions: ${sessions.length}`,
    `Observed actions: ${observations}`,
    `Suggestions: ${suggestions.length}`,
    `Review required: ${counts.review_required || 0}`,
    `Applied: ${counts.applied || 0}`,
    `Discarded: ${counts.discarded || 0}`,
    '',
    'Learning mode never applies policy automatically and never converts a critical hard block into an allow rule.'
  ];
  return lines.join('\n');
}

export function listLearningSuggestions(baseDir) {
  return readJsonFiles(learningSuggestionsDir(resolve(baseDir))).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function suggestionPath(baseDir, id) {
  return resolve(learningSuggestionsDir(resolve(baseDir)), `${safe(id)}.json`);
}

export function loadLearningSuggestion(baseDir, id) {
  if (!id) throw new Error('learning suggestion ID is required');
  const path = suggestionPath(baseDir, id);
  if (!existsSync(path)) throw new Error(`learning suggestion not found: ${id}`);
  return { path, suggestion: JSON.parse(readBoundedFileSync(path, { maxBytes: 2 * 1024 * 1024, label: 'learning suggestion' })) };
}

export function renderLearningReview(baseDir) {
  const suggestions = listLearningSuggestions(baseDir);
  if (!suggestions.length) return 'No learning suggestions';
  const lines = ['RuleOak learning review', ''];
  for (const item of suggestions) {
    lines.push(`- ${item.suggestion_id}`);
    lines.push(`  Status: ${item.status}`);
    lines.push(`  Kind: ${item.kind}`);
    lines.push(`  Effect: ${item.effect}`);
    lines.push(`  Expansion risk: ${item.expansion_risk?.level || 'unknown'} — ${item.expansion_risk?.reason || ''}`);
    lines.push(`  ${item.explanation}`);
  }
  lines.push('', 'No suggestion is active until explicitly applied with --yes');
  return lines.join('\n');
}

export function applyLearningSuggestion(baseDir, id, policy, options = {}) {
  const { path, suggestion } = loadLearningSuggestion(baseDir, id);
  if (suggestion.status === 'applied') throw new Error(`learning suggestion already applied: ${id}`);
  if (!options.yes) return { applied: false, suggestion, path, policy, preview: true };
  const candidate = suggestion.rule_candidate || {};
  let nextPolicy = { ...policy, policyVersion: 2 };
  if (candidate.collection === 'exactActionRules') {
    const rules = Array.isArray(nextPolicy.exactActionRules) ? nextPolicy.exactActionRules : [];
    nextPolicy.exactActionRules = [...rules.filter(item => item.id !== candidate.value.id && item.decision_key !== candidate.value.decision_key), candidate.value];
  } else if (candidate.collection === 'rules') {
    const rules = Array.isArray(nextPolicy.rules) ? nextPolicy.rules : [];
    nextPolicy.rules = [...rules.filter(item => item.id !== candidate.value.id), candidate.value];
  } else throw new Error(`unsupported learning suggestion collection: ${candidate.collection}`);
  const appliedAt = options.appliedAt || new Date().toISOString();
  const updated = { ...suggestion, status: 'applied', applied_at: appliedAt };
  writeJson(path, updated);
  return { applied: true, suggestion: updated, path, policy: nextPolicy, preview: false };
}

export function discardLearningSuggestion(baseDir, id, options = {}) {
  const { path, suggestion } = loadLearningSuggestion(baseDir, id);
  if (!options.yes) return { discarded: false, suggestion, path, preview: true };
  const updated = { ...suggestion, status: 'discarded', discarded_at: options.discardedAt || new Date().toISOString() };
  writeJson(path, updated);
  return { discarded: true, suggestion: updated, path, preview: false };
}
