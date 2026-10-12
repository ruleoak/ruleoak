/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildEffectReceipt, buildEffectVerificationRecord, decideEffectRetry,
  verifyFilesystemPostcondition, verifyProcessPostcondition, verifyHttpPostcondition,
  EFFECT_VERIFICATION_STATES, RETRY_DISPOSITIONS
} from '../src/index.js';

const lease = { lease_id: 'lease_safe_retry', decision_id: 'decision_safe_retry', action_digest: 'sha256:action' };
const ambiguous = buildEffectReceipt(lease, { status: 'unknown', observation_quality: 'ambiguous', requested: { operation: 'write' }, observed: {} }, {
  adapter: 'test', effectId: 'effect_ambiguous', startedAt: '2026-09-02T00:00:00.000Z', completedAt: '2026-09-02T00:00:01.000Z'
});
assert.equal(decideEffectRetry(ambiguous).disposition, RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, 'ambiguous effect must never be blindly retried');

const root = mkdtempSync(join(tmpdir(), 'ruleoak-effect-'));
const target = join(root, 'result.txt');
writeFileSync(target, 'done\n');
const digest = `sha256:${createHash('sha256').update('done\n').digest('hex')}`;
const verified = verifyFilesystemPostcondition({ operation: 'write', path: target }, { expected: { digest } });
assert.equal(verified.state, EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS);
const vr = buildEffectVerificationRecord(ambiguous, verified, { lease, verifiedAt: '2026-09-02T00:00:02.000Z' });
assert.equal(vr.action_digest, lease.action_digest);
assert.equal(vr.effect_id, ambiguous.effect_id);
assert.match(vr.verification_digest, /^sha256:[a-f0-9]{64}$/);
assert.equal(decideEffectRetry(ambiguous, vr, { lease }).disposition, RETRY_DISPOSITIONS.DO_NOT_RETRY);

const unbound = buildEffectVerificationRecord(ambiguous, verified, {});
assert.equal(unbound.state, EFFECT_VERIFICATION_STATES.INVALID, 'verification without exact lease must fail closed');
assert.equal(decideEffectRetry(ambiguous, unbound).disposition, RETRY_DISPOSITIONS.MANUAL_REVIEW);

const wrongContent = join(root, 'wrong.txt');
writeFileSync(wrongContent, 'partial\n');
const mismatch = verifyFilesystemPostcondition({ operation: 'write', path: wrongContent }, { expected: { digest } });
assert.equal(mismatch.state, EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'digest mismatch must not be treated as proof of no effect');
const mismatchVr = buildEffectVerificationRecord(ambiguous, mismatch, { lease });
assert.equal(decideEffectRetry(ambiguous, mismatchVr, { lease }).disposition, RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY);

const absent = join(root, 'not-created.txt');
const notApplied = verifyFilesystemPostcondition({ operation: 'write', path: absent }, { expected: { size: 4 } });
assert.equal(notApplied.state, EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'absence without a captured pre-dispatch state cannot prove the write never happened');
const failVr = buildEffectVerificationRecord(ambiguous, notApplied, { lease });
assert.equal(decideEffectRetry(ambiguous, failVr, { lease }).disposition, RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, 'absence alone does not prove duplicate-safe retry');

const explicitIdempotent = verifyFilesystemPostcondition({ operation: 'write', path: absent, idempotent: true }, { expected: { size: 4, before: { present: false, kind: 'absent' } } });
assert.equal(explicitIdempotent.state, EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE);
const idempotentVr = buildEffectVerificationRecord(ambiguous, explicitIdempotent, { lease });
assert.equal(decideEffectRetry(ambiguous, idempotentVr, { lease }).disposition, RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY, 'explicit idempotency plus captured no-effect state may establish retry safety');

const forged = { ...vr, effect_id: 'effect_other' };
assert.equal(decideEffectRetry(ambiguous, forged, { lease }).disposition, RETRY_DISPOSITIONS.MANUAL_REVIEW, 'verification must bind to the same effect');

const process = verifyProcessPostcondition({ exit_code: 0 });
assert.equal(process.state, EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'process exit 0 cannot prove external side effects');
const sideEffectFreeFailure = verifyProcessPostcondition({ exit_code: 2, side_effect_free: true });
const processVr = buildEffectVerificationRecord(ambiguous, sideEffectFreeFailure, { lease });
assert.equal(decideEffectRetry(ambiguous, processVr, { lease }).disposition, RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY);

const http = await verifyHttpPostcondition({ response_status: 200 });
assert.equal(http.state, EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'HTTP 200 alone cannot prove effect');
const confirmedHttp = await verifyHttpPostcondition({}, { probe: async () => ({ confirmed: true, postcondition: 'object-present' }) });
assert.equal(confirmedHttp.state, EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS);
const absentHttp = await verifyHttpPostcondition({}, { probe: async () => ({ confirmed: false, effect_applied: false, reason: 'object absent' }) });
const absentHttpVr = buildEffectVerificationRecord(ambiguous, absentHttp, { lease });
assert.equal(decideEffectRetry(ambiguous, absentHttpVr, { lease }).disposition, RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, 'remote absence requires explicit retry/no-effect proof');
const retrySafeHttp = await verifyHttpPostcondition({}, { probe: async () => ({ confirmed: false, effect_applied: false, no_effect_proven: true, reason: 'idempotency key lookup confirms no prior effect' }) });
const retrySafeHttpVr = buildEffectVerificationRecord(ambiguous, retrySafeHttp, { lease });
assert.equal(decideEffectRetry(ambiguous, retrySafeHttpVr, { lease }).disposition, RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY);

console.log('Effect verification and verify-before-retry tests passed');
