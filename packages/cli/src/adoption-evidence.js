/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalDigest } from '@ruleoak/core';
import { atomicWriteFileSync } from './io/durable-file.js';
import { buildLocalValueReport } from './value-report.js';

function activationStage(root, report) {
  if (!existsSync(resolve(root, '.ruleoak'))) return 'SETUP_REQUIRED';
  if (!report.protection.active_verified) return 'PROTECTION_NOT_ACTIVE';
  if (!report.protection.effect_boundary_ready) return 'POLICY_ONLY';
  if (!report.protection.first_value_achieved) return 'READY_FOR_FIRST_VALUE';
  if (!report.protection.repeat_use_observed) return 'FIRST_VALUE_CONFIRMED';
  return 'REPEAT_USE_OBSERVED';
}
function nextAction(stage) {
  return ({
    SETUP_REQUIRED: 'ruleoak onboard --init',
    PROTECTION_NOT_ACTIVE: 'ruleoak protect --setup --dry-run',
    POLICY_ONLY: 'add or review an Effect Profile, then run ruleoak protect check --require-effect-boundary',
    READY_FOR_FIRST_VALUE: 'exercise one real protected action, then run ruleoak protect value',
    FIRST_VALUE_CONFIRMED: 'use the protected boundary again on a later day, then run ruleoak feedback snapshot',
    REPEAT_USE_OBSERVED: 'run ruleoak feedback snapshot and review the JSON before sharing it'
  })[stage];
}

export function buildAdoptionSnapshot(baseDir = process.cwd(), options = {}) {
  const root = resolve(baseDir);
  const report = buildLocalValueReport(root, options);
  const stage = activationStage(root, report);
  const snapshot = {
    adoption_snapshot_version: '1.0',
    ruleoak_version: options.version || null,
    generated_at: options.generatedAt || new Date().toISOString(),
    local_only: true,
    user_review_required_before_sharing: true,
    environment: {
      platform: process.platform,
      arch: process.arch,
      node_major: Number(process.versions.node.split('.')[0])
    },
    activation: {
      stage,
      next_action: nextAction(stage),
      protection_active: report.protection.active_verified,
      effect_boundary_ready: report.protection.effect_boundary_ready,
      first_value_achieved: report.protection.first_value_achieved,
      repeat_use_observed: report.protection.repeat_use_observed,
      protected_action_count: report.protection.protected_action_count,
      active_days: report.protection.active_days,
      time_to_first_protected_action_ms: report.protection.time_to_first_protected_action_ms
    },
    safety_value: {
      observed: report.safety_value_observed,
      effect_contract_coverage: report.effects.contract_coverage,
      verification_attempts: report.effects.verification_attempts,
      confirmed_outcomes: report.effects.verified_effects,
      ambiguous_or_unknown: report.effects.ambiguous_or_unknown,
      do_not_retry_decisions: report.effects.do_not_retry_decisions,
      safe_retry_with_new_authority: report.effects.safe_retry_with_new_authority,
      unresolved_effects: report.effects.unresolved
    },
    evidence: {
      valid: report.evidence_valid,
      event_count: report.evidence_event_count
    },
    privacy: {
      project_path_included: false,
      hostname_included: false,
      username_included: false,
      prompts_included: false,
      tool_arguments_included: false,
      credentials_included: false,
      raw_evidence_included: false,
      evidence_hash_included: false
    },
    external_adoption_proven: false,
    claim_boundary: 'This snapshot contains local aggregate activation/safety signals only. It does not prove retention, willingness to pay, prevented incidents, or external adoption.'
  };
  snapshot.snapshot_digest = canonicalDigest(snapshot);
  return snapshot;
}

export function writeAdoptionSnapshot(baseDir = process.cwd(), outPath = 'ruleoak-adoption-snapshot.json', options = {}) {
  const snapshot = buildAdoptionSnapshot(baseDir, options);
  const path = resolve(outPath);
  atomicWriteFileSync(path, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600, maxBytes: 128 * 1024, label: 'adoption snapshot' });
  return { path, snapshot };
}
