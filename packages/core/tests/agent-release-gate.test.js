/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { evaluateAgentReleaseGate, buildAgentReleasePassport, AGENT_RELEASE_STATES } from '../src/index.js';

const baseline = {
  release_id: 'prod', suite_id: 'agent-suite', suite_version: '1', evidence_fingerprint: 'sha256:base', capability_fingerprint: 'sha256:c1',
  task_success_rate: .90, critical_case_failures: [], unsafe_tool_calls: 0, duplicate_effects: 0, ambiguous_effects: 0,
  effect_verification_coverage: 1, capability_reviewed: true, crashlab_status: 'PASS', latency_ms: 100, cost_usd: 1
};
const safe = { ...baseline, release_id: 'candidate', evidence_fingerprint: 'sha256:cand', task_success_rate: .94, latency_ms: 95, cost_usd: .8 };
const pass = evaluateAgentReleaseGate(baseline, safe);
assert.equal(pass.state, AGENT_RELEASE_STATES.PASS);
assert.match(pass.policy_digest, /^sha256:[a-f0-9]{64}$/);
const passport = buildAgentReleasePassport(baseline, safe, pass, { generatedAt: '2026-09-02T00:00:00.000Z' });
assert.match(passport.passport_digest, /^sha256:[a-f0-9]{64}$/);
assert.equal(passport.decision.state, 'PASS');

const dup = evaluateAgentReleaseGate(baseline, { ...safe, duplicate_effects: 1 });
assert.equal(dup.state, AGENT_RELEASE_STATES.BLOCK);
assert.match(dup.blocking_reasons.join(' '), /duplicate effects/);

const nullSafetyMetric = evaluateAgentReleaseGate(baseline, { ...safe, unsafe_tool_calls: null });
assert.equal(nullSafetyMetric.state, AGENT_RELEASE_STATES.INSUFFICIENT_EVIDENCE, 'null must not coerce to numeric zero');
assert.match(nullSafetyMetric.evidence_gaps.join(' '), /unsafe_tool_calls/);

const changedWithoutAssessment = evaluateAgentReleaseGate(baseline, { ...safe, capability_fingerprint: 'sha256:c2' });
assert.equal(changedWithoutAssessment.state, AGENT_RELEASE_STATES.INSUFFICIENT_EVIDENCE);
assert.match(changedWithoutAssessment.evidence_gaps.join(' '), /capability_drift/);

const drift = evaluateAgentReleaseGate(baseline, { ...safe, capability_fingerprint: 'sha256:c2', capability_drift: { requires_policy_review: true } });
assert.equal(drift.state, AGENT_RELEASE_STATES.BLOCK);
assert.match(drift.blocking_reasons.join(' '), /review bound/);

const reviewedDrift = evaluateAgentReleaseGate(baseline, {
  ...safe,
  capability_fingerprint: 'sha256:c2',
  capability_reviewed: true,
  capability_review_fingerprint: 'sha256:c2',
  capability_drift: { requires_policy_review: true }
});
assert.equal(reviewedDrift.state, AGENT_RELEASE_STATES.PASS_WITH_CONDITIONS);
assert.match(reviewedDrift.warnings.join(' '), /explicitly reviewed/);

const sparse = evaluateAgentReleaseGate(baseline, { ...safe, effect_verification_coverage: .5 });
assert.equal(sparse.state, AGENT_RELEASE_STATES.INSUFFICIENT_EVIDENCE);
const incomparable = evaluateAgentReleaseGate(baseline, { ...safe, suite_version: '2' });
assert.equal(incomparable.state, AGENT_RELEASE_STATES.INCOMPARABLE);
const modelConditions = evaluateAgentReleaseGate(baseline, { ...safe, model_qualification: { verdict: 'SAFE_WITH_CONDITIONS' } });
assert.equal(modelConditions.state, AGENT_RELEASE_STATES.PASS_WITH_CONDITIONS);
console.log('Agent Release Gate tests passed');
