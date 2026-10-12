/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { canonicalStringify } from '../decision/receipt.js';
import { verifyEffectReceipt } from './effect-receipt.js';

export const EFFECT_VERIFICATION_STATES = Object.freeze({
  CONFIRMED_SUCCESS: 'confirmed_success',
  CONFIRMED_FAILURE: 'confirmed_failure',
  PARTIAL_OR_AMBIGUOUS: 'partial_or_ambiguous',
  UNKNOWN: 'unknown',
  INVALID: 'invalid'
});
export const RETRY_DISPOSITIONS = Object.freeze({
  DO_NOT_RETRY: 'do_not_retry',
  SAFE_TO_RETRY_WITH_NEW_AUTHORITY: 'safe_to_retry_with_new_authority',
  VERIFY_BEFORE_RETRY: 'verify_before_retry',
  MANUAL_REVIEW: 'manual_review'
});

function sha256(bytes) { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function record(state, reason, evidence = {}) { return { state, reason, evidence: structuredClone(evidence) }; }
function normalizeExpected(requested = {}, options = {}) { return options.expected ?? requested.expected ?? requested.postcondition ?? {}; }
function canonicalPotentialPath(value) {
  if(!value)return null;
  const absolute=resolve(String(value));let probe=absolute;
  while(!existsSync(probe)){const parent=dirname(probe);if(parent===probe)return null;probe=parent;}
  try{const real=realpathSync.native?realpathSync.native(probe):realpathSync(probe);return resolve(real,relative(probe,absolute));}catch{return null;}
}
function pathWithin(root,target){const r=relative(resolve(root),resolve(target));return r===''||(!r.startsWith('..')&&!resolve(target).startsWith(resolve(root)+'.'));}
function pathBinding(path,expectedCanonical,allowedRoot){
  if(!expectedCanonical&&!allowedRoot)return {ok:true};
  const current=canonicalPotentialPath(path);if(!current)return {ok:false,reason:'filesystem target path can no longer be canonicalized'};
  if(expectedCanonical&&resolve(current)!==resolve(String(expectedCanonical)))return {ok:false,reason:'filesystem target canonical path changed after dispatch',current,expected:resolve(String(expectedCanonical))};
  if(allowedRoot&&!pathWithin(String(allowedRoot),current))return {ok:false,reason:'filesystem target resolved outside the reviewed effect root',current,allowed_root:resolve(String(allowedRoot))};
  return {ok:true,current};
}

function retrySafeRequested(requested = {}, options = {}) {
  return options.retrySafe === true || options.idempotent === true || requested.retry_safe === true || requested.idempotent === true;
}
function bindVerification(receipt, verification, options = {}) {
  const lease = options.lease;
  const out = {
    verification_version: '1.0',
    verification_id: options.verificationId || `verify_${createHash('sha256').update(canonicalStringify({
      effect_id: receipt?.effect_id || null,
      state: verification?.state || 'invalid',
      evidence: verification?.evidence || {},
      nonce: options.nonce || ''
    })).digest('hex').slice(0, 24)}`,
    effect_id: receipt?.effect_id || null,
    lease_id: receipt?.lease_id || null,
    decision_id: receipt?.decision_id || null,
    action_digest: lease?.action_digest || options.actionDigest || null,
    verified_at: new Date(options.verifiedAt || new Date()).toISOString(),
    state: verification?.state || EFFECT_VERIFICATION_STATES.INVALID,
    reason: String(verification?.reason || 'verification result missing'),
    evidence: structuredClone(verification?.evidence || {})
  };
  out.verification_digest = sha256(Buffer.from(canonicalStringify(out)));
  return out;
}

/**
 * Bind postcondition verification to the exact EffectReceipt and ExecutionLease.
 * The lease is mandatory because the EffectReceipt intentionally does not duplicate
 * the action digest. Without the lease RuleOak cannot truthfully claim exact-action
 * binding, so the verification record fails closed.
 */
export function buildEffectVerificationRecord(receipt, verification, options = {}) {
  if (!options.lease?.lease_id || !options.lease?.action_digest) {
    return bindVerification(receipt, record(
      EFFECT_VERIFICATION_STATES.INVALID,
      'effect verification requires the exact execution lease with action_digest',
      { binding_error: 'execution_lease_required' }
    ), options);
  }
  const validation = verifyEffectReceipt(receipt, { lease: options.lease, requireSignature: false });
  if (!validation.ok) {
    return bindVerification(receipt, record(
      EFFECT_VERIFICATION_STATES.INVALID,
      `invalid effect receipt: ${validation.errors.join('; ')}`,
      { errors: validation.errors }
    ), options);
  }
  if (options.actionDigest && options.actionDigest !== options.lease.action_digest) {
    return bindVerification(receipt, record(
      EFFECT_VERIFICATION_STATES.INVALID,
      'action digest binding mismatch',
      { binding_error: 'action_digest_mismatch' }
    ), options);
  }
  return bindVerification(receipt, verification, options);
}

export function verifyFilesystemPostcondition(requested = {}, options = {}) {
  const operation = String(options.operation || requested.operation || requested.action || '').toLowerCase();
  const expected = normalizeExpected(requested, options);
  const retrySafe = retrySafeRequested(requested, options);
  const path = options.path || requested.path || requested.target || requested.resource;

  function snapshot(target) {
    if (!target) return { present: false, kind: 'unknown' };
    if (!existsSync(target)) return { present: false, kind: 'absent' };
    try {
      const link = lstatSync(target);
      if (link.isSymbolicLink()) return { present: true, kind: 'symlink', size: link.size };
      const stat = statSync(target);
      const kind = stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'other';
      const out = { present: true, kind, size: stat.size };
      if (kind === 'file') out.digest = sha256(readFileSync(target));
      return out;
    } catch (error) {
      return { present: true, kind: 'unknown', error: String(error?.message || error) };
    }
  }
  function matches(current, before = null) {
    if (!before || typeof before !== 'object') return false;
    if (Boolean(current.present) !== Boolean(before.present)) return false;
    if (!before.present) return !current.present;
    if (before.kind && before.kind !== 'unknown' && current.kind !== before.kind) return false;
    if (before.digest) return current.digest === before.digest;
    if (Number.isFinite(before.size) && Number.isFinite(current.size)) return Number(before.size) === Number(current.size);
    return false;
  }

  if (operation.includes('move') || operation.includes('rename')) {
    const source = options.source || requested.source || requested.from || path;
    const destination = options.destination || requested.destination || requested.to || requested.target;
    if (!source || !destination) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'filesystem move verifier requires source and destination');
    const sourceBinding=pathBinding(source,expected.source_canonical_path||expected.sourceCanonicalPath,expected.source_allowed_root||expected.sourceAllowedRoot);
    const destinationBinding=pathBinding(destination,expected.destination_canonical_path||expected.destinationCanonicalPath,expected.destination_allowed_root||expected.destinationAllowedRoot);
    if(!sourceBinding.ok||!destinationBinding.ok)return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS,[sourceBinding.reason,destinationBinding.reason].filter(Boolean).join('; '),{source,destination,effect_applied:null,retry_safe:false,path_binding:{source:sourceBinding,destination:destinationBinding}});
    const src = snapshot(source), dst = snapshot(destination);
    const sourceBefore = expected.source_before || expected.sourceBefore || null;
    const destinationBefore = expected.destination_before || expected.destinationBefore || null;
    const evidence = { source, destination, source_state: src, destination_state: dst, effect_applied: null, retry_safe: false };
    const destinationMatchesSource = Boolean(dst.present && sourceBefore?.present &&
      sourceBefore.kind === 'file' && sourceBefore.digest && dst.kind === 'file' && dst.digest === sourceBefore.digest);
    if (!src.present && destinationMatchesSource) {
      evidence.effect_applied = true;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'filesystem move postcondition is confirmed: source is absent and destination matches the pre-dispatch source', evidence);
    }
    if (matches(src, sourceBefore) && matches(dst, destinationBefore)) {
      evidence.effect_applied = false;
      evidence.retry_safe = retrySafe;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'filesystem source and destination still match the captured pre-dispatch state; the requested move is not observed', evidence);
    }
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem move state differs from both the expected postcondition and captured pre-dispatch state', evidence);
  }

  if (!path) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'filesystem verifier requires an explicit path');
  const binding=pathBinding(path,expected.canonical_path||expected.canonicalPath,expected.allowed_root||expected.allowedRoot);
  if(!binding.ok)return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS,binding.reason,{path,effect_applied:null,retry_safe:false,path_binding:binding});
  const current = snapshot(path);
  const before = expected.before || expected.precondition || null;

  if (['delete', 'remove', 'unlink'].some(v => operation.includes(v))) {
    if (!current.present) return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'target is absent after requested deletion', { path, present: false, effect_applied: true, retry_safe: false });
    if (matches(current, before)) return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'target still exactly matches the captured pre-dispatch state; deletion is not observed', { path, ...current, effect_applied: false, retry_safe: retrySafe });
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'target exists but no longer matches the captured pre-dispatch state; deletion/recreation or competing effects remain possible', { path, ...current, effect_applied: null, retry_safe: false });
  }

  if (operation.includes('create_directory') || operation.includes('mkdir') || expected.kind === 'directory') {
    if (current.present && current.kind === 'directory') return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'expected filesystem directory exists', { path, ...current, effect_applied: true, retry_safe: false });
    if (matches(current, before)) return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'filesystem state still matches the captured pre-dispatch state; directory creation is not observed', { path, ...current, effect_applied: false, retry_safe: retrySafe });
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem directory postcondition is not satisfied and no-effect is not proven', { path, ...current, effect_applied: null, retry_safe: false });
  }

  if (!current.present) {
    if (before && before.present === false) return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'target remains absent exactly as captured before dispatch; requested create/write effect is not observed', { path, present: false, effect_applied: false, retry_safe: retrySafe });
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'target is absent after requested create/write, but the captured pre-dispatch state does not prove the action never occurred', { path, present: false, effect_applied: null, retry_safe: false });
  }

  const evidence = { path, present: true, size: current.size, kind: current.kind, effect_applied: null, retry_safe: false };
  if (expected.sha256 || expected.digest) {
    if (current.kind !== 'file') {
      return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem target exists but is not a regular file; exact content postcondition is not satisfied', evidence);
    }
    const expectedDigest = String(expected.sha256 || expected.digest).replace(/^sha256:/, '');
    evidence.digest = current.digest;
    evidence.expected_digest = `sha256:${expectedDigest}`;
    if (current.digest === evidence.expected_digest) {
      evidence.effect_applied = true;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'filesystem content digest matches expected postcondition', evidence);
    }
    if (matches(current, before)) {
      evidence.effect_applied = false;
      evidence.retry_safe = retrySafe;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'filesystem target still exactly matches the captured pre-dispatch state; requested content was not applied', evidence);
    }
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem content digest does not match the expected postcondition or captured pre-dispatch state', evidence);
  }
  if (Number.isFinite(expected.size)) {
    evidence.expected_size = Number(expected.size);
    if (current.size === Number(expected.size)) {
      evidence.effect_applied = true;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'filesystem size matches expected postcondition', evidence);
    }
    if (matches(current, before)) {
      evidence.effect_applied = false;
      evidence.retry_safe = retrySafe;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'filesystem target still matches captured pre-dispatch state; requested size postcondition was not applied', evidence);
    }
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem size does not match expected postcondition or captured pre-dispatch state', evidence);
  }
  return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'filesystem target exists, but no exact content postcondition was supplied', evidence);
}

function git(repo, args) {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  return { ok: r.status === 0, value: String(r.stdout || '').trim(), error: String(r.stderr || '').trim() };
}
export function verifyGitPostcondition(requested = {}, options = {}) {
  const repo = options.repo || requested.repo || requested.cwd || process.cwd();
  const operation = String(options.operation || requested.operation || requested.action || '').toLowerCase();
  const expected = normalizeExpected(requested, options);
  const retrySafe = retrySafeRequested(requested, options);
  if (operation.includes('branch')) {
    const ref = expected.ref || requested.ref || requested.branch;
    if (!ref) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'git branch verification requires expected.ref or branch');
    const r = git(repo, ['rev-parse', '--verify', ref]);
    return r.ok
      ? record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'expected git branch/ref exists', { repo, ref, effect_applied: true, retry_safe: false, oid: r.value })
      : record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'expected git branch/ref is absent', { repo, ref, effect_applied: false, retry_safe: retrySafe, error: r.error });
  }
  if (operation.includes('commit')) {
    const head = git(repo, ['rev-parse', 'HEAD']);
    if (!head.ok) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'unable to read git HEAD', { repo, error: head.error, retry_safe: false });
    const expectedHead = expected.head || expected.oid || requested.expected_head;
    if (expectedHead) {
      return head.value === expectedHead
        ? record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'git HEAD matches expected commit', { repo, head: head.value, effect_applied: true, retry_safe: false })
        : record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'git HEAD does not match expected commit; the attempted commit may still exist or history may have advanced', { repo, head: head.value, expected_head: expectedHead, effect_applied: null, retry_safe: false });
    }
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'git HEAD is observable, but no expected commit was supplied', { repo, head: head.value, effect_applied: null, retry_safe: false });
  }
  if (operation.includes('push')) {
    const remote = expected.remote || requested.remote || 'origin';
    const ref = expected.ref || requested.ref || requested.branch;
    if (!ref) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'git push verification requires a ref');
    if (options.allowNetwork !== true) return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'remote push effect requires an explicit remote postcondition check; network verification is disabled by default', { repo, remote, ref, effect_applied: null, retry_safe: false });
    const local = git(repo, ['rev-parse', ref]);
    const remoteRef = git(repo, ['ls-remote', remote, ref]);
    if (!local.ok || !remoteRef.ok) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'unable to compare local and remote git refs', { repo, remote, ref, local_error: local.error, remote_error: remoteRef.error, retry_safe: false });
    const remoteOid = remoteRef.value.split(/\s+/)[0] || '';
    const applied = Boolean(remoteOid) && remoteOid === local.value;
    return applied
      ? record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'remote git ref matches local expected ref', { repo, remote, ref, local_oid: local.value, remote_oid: remoteOid, effect_applied: true, retry_safe: false })
      : record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'remote git ref does not match local expected ref; remote history may have changed after or around the attempted push', { repo, remote, ref, local_oid: local.value, remote_oid: remoteOid, effect_applied: null, retry_safe: false });
  }
  return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'unsupported git postcondition operation', { repo, operation, retry_safe: false });
}

export function verifyProcessPostcondition(requested = {}, options = {}) {
  const exitCode = options.exitCode ?? requested.exit_code;
  const sideEffectFree = options.sideEffectFree === true || requested.side_effect_free === true;
  if (!Number.isInteger(exitCode)) return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'process verifier requires an observed integer exit code');
  if (sideEffectFree) {
    return exitCode === 0
      ? record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, 'side-effect-free process completed successfully', { exit_code: exitCode, effect_applied: true, retry_safe: false })
      : record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, 'side-effect-free process failed', { exit_code: exitCode, effect_applied: false, retry_safe: true });
  }
  return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'process return is observed, but external side effects are not proven by exit status alone', { exit_code: exitCode, effect_applied: null, retry_safe: false });
}

export async function verifyHttpPostcondition(requested = {}, options = {}) {
  if (typeof options.probe !== 'function') return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, 'HTTP response alone does not prove an external side effect; provide an explicit postcondition probe', { response_status: options.responseStatus ?? requested.response_status ?? null, effect_applied: null, retry_safe: false });
  try {
    const result = await options.probe();
    if (result?.confirmed === true) return record(EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS, result.reason || 'HTTP/API postcondition probe confirmed the requested effect', { ...result, effect_applied: true, retry_safe: false });
    if (result?.confirmed === false && result?.effect_applied === false) {
      const retrySafe = result.retry_safe === true || result.retrySafe === true || result.no_effect_proven === true;
      return record(EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE, result.reason || 'HTTP/API postcondition probe confirmed the requested postcondition is absent', { ...result, effect_applied: false, retry_safe: retrySafe });
    }
    return record(EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, result?.reason || 'HTTP/API postcondition probe did not establish a complete effect', { ...result, effect_applied: result?.effect_applied ?? null, retry_safe: false });
  } catch (error) {
    return record(EFFECT_VERIFICATION_STATES.UNKNOWN, 'HTTP/API postcondition probe failed', { error: String(error?.message || error), effect_applied: null, retry_safe: false });
  }
}

function verificationBindingErrors(receipt, verificationRecord, lease) {
  const errors = [];
  if (!verificationRecord) return errors;
  if (verificationRecord.effect_id !== receipt?.effect_id) errors.push('verification effect_id does not match EffectReceipt');
  if (verificationRecord.lease_id !== receipt?.lease_id) errors.push('verification lease_id does not match EffectReceipt');
  if (verificationRecord.decision_id !== receipt?.decision_id) errors.push('verification decision_id does not match EffectReceipt');
  if (!verificationRecord.action_digest) errors.push('verification action_digest is missing');
  if (lease) {
    if (lease.lease_id !== receipt?.lease_id) errors.push('retry lease does not match EffectReceipt');
    if (lease.decision_id !== receipt?.decision_id) errors.push('retry lease decision does not match EffectReceipt');
    if (lease.action_digest !== verificationRecord.action_digest) errors.push('verification action_digest does not match execution lease');
  }
  return errors;
}

export function decideEffectRetry(receipt, verificationRecord = null, options = {}) {
  const bindingErrors = verificationBindingErrors(receipt, verificationRecord, options.lease);
  if (bindingErrors.length) return { disposition: RETRY_DISPOSITIONS.MANUAL_REVIEW, reason: bindingErrors.join('; '), requires_new_authority: true };

  const v = verificationRecord?.state;
  const quality = receipt?.observation_quality;
  const status = receipt?.status;
  if (v === EFFECT_VERIFICATION_STATES.INVALID) return { disposition: RETRY_DISPOSITIONS.MANUAL_REVIEW, reason: 'effect evidence or verification binding is invalid', requires_new_authority: true };
  if (v === EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS) return { disposition: RETRY_DISPOSITIONS.DO_NOT_RETRY, reason: 'requested effect is confirmed; retry could duplicate the side effect', requires_new_authority: false };
  if (v === EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE && verificationRecord?.evidence?.effect_applied === false && verificationRecord?.evidence?.retry_safe === true) {
    return { disposition: RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY, reason: 'postcondition plus verifier contract establish duplicate-safe retry; a retry still requires a fresh one-use execution authority', requires_new_authority: true };
  }
  if (v === EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE) return { disposition: RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, reason: 'the desired postcondition is absent, but no-effect/idempotency proof is missing; do not infer retry safety', requires_new_authority: true };
  if ([EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS, EFFECT_VERIFICATION_STATES.UNKNOWN].includes(v)) return { disposition: RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, reason: 'effect remains partial, ambiguous, or unknown; do not retry blindly', requires_new_authority: true };
  if (['ambiguous', 'partial', 'requested_only'].includes(quality) || ['partial', 'unknown'].includes(status)) return { disposition: RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, reason: 'EffectReceipt does not prove a complete outcome; verify the postcondition before retry', requires_new_authority: true };
  if (status === 'success' && quality === 'complete_for_adapter') return { disposition: RETRY_DISPOSITIONS.DO_NOT_RETRY, reason: 'adapter-complete EffectReceipt reports success; do not duplicate the action', requires_new_authority: false };
  if (status === 'failure' && quality === 'complete_for_adapter' && options.completeFailureMeansNoEffect === true) return { disposition: RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY, reason: 'adapter contract explicitly proves a complete failure with no effect', requires_new_authority: true };
  return { disposition: RETRY_DISPOSITIONS.VERIFY_BEFORE_RETRY, reason: 'no proof that retry is duplicate-safe', requires_new_authority: true };
}
