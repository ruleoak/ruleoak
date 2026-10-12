/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdirSync, renameSync, writeFileSync, chmodSync } from 'node:fs';
import { readBoundedFileSync } from '../io/durable-file.js';
import { basename, dirname, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { ApprovalBroker } from '../approval/provider.js';
import { applyApprovalResult } from '../approval/contract.js';
import { buildDecisionReceipt, canonicalDigest } from '../decision/receipt.js';
import { consumeExecutionGrant } from '../decision/consumer.js';
import { buildExecutionLease, issueExecutionLease, consumeExecutionLease } from '../execution/lease.js';
import { buildEffectReceipt } from '../execution/effect-receipt.js';
import { buildEffectVerificationRecord, decideEffectRetry, EFFECT_VERIFICATION_STATES, verifyFilesystemPostcondition, verifyGitPostcondition, verifyHttpPostcondition, verifyProcessPostcondition } from '../execution/effect-verification.js';
import { inferFilesystemEffectContract } from '../execution/effect-contract.js';
import { evaluatePermissionRequest } from '../permission/gateway.js';
import { EvidenceRecorder } from '../protocol/recorder.js';
import { adaptAction, adaptAuthorizationRequest, adaptFilesystemAction, adaptHttpAction, adaptMcpToolCall, adaptOpenAIToolCall, adaptShellCommand, RuleOakAuthorizationError } from '../adapters/index.js';

export const RULEOAK_RESULT_METADATA = Symbol.for('ruleoak.result.metadata');
const resultMetadata = new WeakMap();


function safeErrorRecord(error) {
  if (!error) return null;
  return { name: String(error.name || 'Error').slice(0, 128), message: String(error.message || error).slice(0, 2048), code: error.code == null ? null : String(error.code).slice(0, 128) };
}
function sha256Value(value) { return `sha256:${createHash('sha256').update(value).digest('hex')}`; }
function inferEffectKind(descriptor = {}, request = {}) {
  if (descriptor.effectKind) return descriptor.effectKind;
  const category = String(descriptor.category || request?.tool?.category || request?.action?.category || '').toLowerCase();
  const name = String(descriptor.name || request?.tool?.name || request?.action?.name || '').toLowerCase();
  if (category === 'file' || name.startsWith('filesystem.')) return 'filesystem';
  if (category === 'git' || name.startsWith('git.')) return 'git';
  if (category === 'web' || name.startsWith('http.')) return 'http';
  if (category === 'shell' || name.startsWith('shell.') || name.startsWith('process.')) return 'process';
  return 'unknown';
}
async function verifyGuardedEffect(descriptor, request, args, value, executionError, effectReceipt, effectContract = null) {
  if (typeof descriptor.effectVerifier === 'function') return descriptor.effectVerifier({ request, args, value, executionError, effectReceipt, effectContract });
  if (effectContract?.verifier_spec?.kind === 'filesystem') {
    const spec = effectContract.verifier_spec;
    return verifyFilesystemPostcondition(spec, spec);
  }
  const mapped = typeof descriptor.mapArguments === 'function' ? await descriptor.mapArguments(args) : object(request?.arguments);
  const operation = descriptor.operation || request?.tool?.operation || request?.action?.operation || request?.action?.name || descriptor.name;
  const retrySafe = descriptor.idempotent === true || mapped?.idempotent === true || mapped?.retry_safe === true;
  switch (inferEffectKind(descriptor, request)) {
    case 'filesystem': {
      const path = descriptor.effectPath ? (typeof descriptor.effectPath === 'function' ? descriptor.effectPath(args, value) : descriptor.effectPath) : mapped?.path || request?.target?.resource || request?.resource?.resource;
      const content = mapped?.content ?? mapped?.data ?? mapped?.body;
      const expected = descriptor.expectedEffect || mapped?.expected || (content !== undefined ? { sha256: sha256Value(Buffer.isBuffer(content) ? content : Buffer.from(String(content))) } : {});
      return verifyFilesystemPostcondition({ operation, path, expected, idempotent: retrySafe }, { operation, path, expected, idempotent: retrySafe });
    }
    case 'git': return verifyGitPostcondition({ operation, ...mapped, idempotent: retrySafe }, { operation, repo: descriptor.repo || mapped?.repo || mapped?.cwd, expected: descriptor.expectedEffect || mapped?.expected, idempotent: retrySafe, allowNetwork: descriptor.allowNetworkVerification === true });
    case 'http': {
      if (typeof descriptor.httpPostconditionProbe !== 'function') return { state: EFFECT_VERIFICATION_STATES.UNKNOWN, reason: 'HTTP effects require an explicit postcondition probe; response status is not effect proof', evidence: { effect_applied: null, retry_safe: false } };
      return verifyHttpPostcondition({ operation, ...mapped, idempotent: retrySafe }, { probe: descriptor.httpPostconditionProbe, idempotent: retrySafe });
    }
    case 'process': return verifyProcessPostcondition({ operation, ...mapped, idempotent: retrySafe }, { exitCode: executionError ? null : (descriptor.exitCode ?? 0), sideEffectFree: descriptor.sideEffectFree === true, postconditionProbe: descriptor.processPostconditionProbe, idempotent: retrySafe });
    default: return { state: EFFECT_VERIFICATION_STATES.UNKNOWN, reason: 'no safe postcondition verifier is configured for this guarded effect', evidence: { effect_applied: null, retry_safe: false } };
  }
}
function effectStatePath(workspace, effectId, bucket = 'pending') { return resolve(workspace, 'effects', bucket, `${String(effectId).replace(/[^A-Za-z0-9_.-]/g, '_')}.json`); }
function persistEffectState(workspace, state) {
  const unresolved = ['partial_or_ambiguous', 'unknown', 'invalid'].includes(state?.effect_verification?.state);
  const bucket = unresolved ? 'pending' : 'resolved';
  const path = effectStatePath(workspace, state.effect_receipt.effect_id, bucket);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const data = JSON.stringify({ effect_state_version: state.effect_binding_digest ? '1.1' : '1.0', updated_at: new Date().toISOString(), ...state }, null, 2) + '\n';
  // write through the existing durable helper used for policy/evidence state
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  // sync path is deliberate: the state must exist before returning control to the caller
  requireWriteFile(tmp, data);
  renameSync(tmp, path);
  const other = effectStatePath(workspace, state.effect_receipt.effect_id, bucket === 'pending' ? 'resolved' : 'pending');
  try { if (existsSync(other)) renameSync(other, `${other}.superseded`); } catch {}
  return path;
}
function requireWriteFile(path, data) {
  // isolated helper avoids exposing raw effect bodies through a public API
  writeFileSync(path, data, { mode: 0o600 });
  if (process.platform !== 'win32') chmodSync(path, 0o600);
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function resolveWorkspace(input = '.ruleoak') {
  const absolute = resolve(String(input || '.ruleoak'));
  return basename(absolute) === '.ruleoak' ? absolute : resolve(absolute, '.ruleoak');
}

function readPolicy(workspace, explicitPolicy) {
  if (explicitPolicy) return structuredClone(explicitPolicy);
  const path = resolve(workspace, 'policy.json');
  if (!existsSync(path)) throw new Error(`RuleOak policy not found: ${path}`);
  return JSON.parse(readBoundedFileSync(path,{maxBytes:8*1024*1024,label:'RuleOak policy'}));
}

function approvalAction(response) {
  const value = response?.decision || response?.action || response?.status;
  if (['allow', 'allow_once', 'allow_session', 'always_allow'].includes(value)) return 'allow';
  if (['deny', 'deny_once', 'deny_session', 'always_block', 'block'].includes(value)) return 'deny';
  return 'needs_approval';
}

function decorateResult(value, metadata, resultMode = 'preserve') {
  if (resultMode === 'envelope') return { value, ruleoak: metadata };
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    resultMetadata.set(value, metadata);
    try {
      Object.defineProperty(value, RULEOAK_RESULT_METADATA, {
        configurable: true,
        enumerable: false,
        value: metadata
      });
    } catch { /* frozen third-party results remain accessible through getRuleOakMetadata when possible */ }
  }
  return value;
}

export function getRuleOakMetadata(value) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  return value[RULEOAK_RESULT_METADATA] || resultMetadata.get(value) || null;
}

export class RuleOakApprovalRequiredError extends RuleOakAuthorizationError {
  constructor(result) {
    super(result);
    this.name = 'RuleOakApprovalRequiredError';
    this.code = 'RULEOAK_APPROVAL_REQUIRED';
    this.approvalId = result?.approval?.approval_id || result?.decision?.approvalId || null;
  }
}

function effectiveAuthorizationError(result) {
  if (result?.decision?.action === 'needs_approval') return new RuleOakApprovalRequiredError(result);
  const error = new RuleOakAuthorizationError(result);
  error.code = 'RULEOAK_DENIED';
  return error;
}

/**
 * Create a high-level RuleOak runtime for an existing Node.js agent.
 * The runtime keeps policy evaluation, approval, receipts and evidence on one path.
 */
export async function createRuleOak(options = {}) {
  const workspace = resolveWorkspace(options.workspace || '.ruleoak');
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  const policy = readPolicy(workspace, options.policy);
  const evidenceFile = resolve(workspace, options.evidenceFile || 'evidence.jsonl');
  const recorder = options.recorder || new EvidenceRecorder(evidenceFile, { fsync: options.fsyncEvidence !== false });
  const broker = options.approvalProvider ? new ApprovalBroker(options.approvalProvider,{timeoutMs:options.approvalProviderTimeoutMs}) : null;
  const receiptMode = options.receiptMode || 'automatic';
  const receiptAudience = options.receiptAudience || 'ruleoak-sdk-executor';
  const consumedStore = resolve(workspace, 'consumed-receipts');
  const consumedLeaseStore = resolve(workspace, 'consumed-leases');
  const approvalUseStore = resolve(workspace, 'approval-uses');
  const executionSecret = options.executionSecret || randomBytes(32).toString('hex');
  const defaultActor = object(options.actor);
  let lastExecution = null;

  async function authorize(input, callOptions = {}) {
    const normalized = adaptAction(input, { ...options, ...callOptions, actor: callOptions.actor || defaultActor });
    const evaluatedAt = callOptions.evaluatedAt || new Date().toISOString();
    let result = evaluatePermissionRequest(normalized, policy, {
      ...options,
      ...callOptions,
      evaluatedAt,
      receiptSecret: callOptions.receiptSecret ?? options.receiptSecret,
      receiptAudience: callOptions.receiptAudience || receiptAudience,
      receiptOneTime: true
    });
    const initialEvent = recorder.append(result.action, result.decision, evaluatedAt);
    let approval = null;
    let approvalResolved = false;

    if (result.decision.action === 'needs_approval' && broker) {
      const brokerResult = await broker.request(result, {
        requestedAt: evaluatedAt,
        decisionChannel: `sdk:${broker.provider.name}`,
        context: callOptions.approvalContext,
        timeoutMs: callOptions.approvalProviderTimeoutMs ?? options.approvalProviderTimeoutMs
      });
      approval = brokerResult.request;
      const response = object(brokerResult.response);
      if (response.approval_result_version === '1.0') {
        result = applyApprovalResult(result, approval, response, policy, {
          now: response.decided_at,
          secret: callOptions.approvalSecret ?? options.approvalSecret,
          requireSignature: Boolean(callOptions.requireApprovalSignature ?? options.requireApprovalSignature),
          providerId: broker.provider.providerId || broker.provider.name,
          receiptSecret: callOptions.receiptSecret ?? options.receiptSecret,
          receiptAudience: callOptions.receiptAudience || receiptAudience,
          receiptIssuer: options.receiptIssuer || 'ruleoak-sdk'
        });
        approvalResolved = true;
      } else {
        const action = approvalAction(response);
        if (broker.provider.apiVersion === '1.1' && action !== 'needs_approval') throw new Error(`approval provider ${broker.provider.name} must return ApprovalResult v1 for an immediate decision`);
        if (action !== 'needs_approval') {
          const finalDecision = {
            ...result.decision,
            action,
            reason: response.reason || `${response.decision || response.action} through legacy approval provider ${broker.provider.name}`,
            matchedRule: `approval-legacy:${response.decision || response.action || action}`,
            approvalId: approval.approval_id,
            trace: [...(result.decision.trace || []), { stage: 'approval-legacy', provider: broker.provider.name, decision: response.decision || response.action || action }]
          };
          finalDecision.receipt = buildDecisionReceipt({ ...result, decision: finalDecision }, policy, { evaluatedAt, secret: callOptions.receiptSecret ?? options.receiptSecret, audience: callOptions.receiptAudience || receiptAudience, issuer: options.receiptIssuer || 'ruleoak-sdk', oneTime: true });
          result = { ...result, decision: finalDecision };
          approvalResolved = true;
        } else {
          result = { ...result, approval, decision: { ...result.decision, approvalId: approval.approval_id } };
        }
      }
    }

    const finalEvent = approvalResolved
      ? recorder.append(result.action, result.decision, evaluatedAt)
      : initialEvent;
    return {
      ...result,
      approval,
      evidence: {
        initial_event_id: initialEvent.event_id,
        final_event_id: finalEvent.event_id,
        evidence_file: evidenceFile
      }
    };
  }

  function consume(result, input, consumeOptions = {}) {
    if (receiptMode === 'off') return { ok: true, consumed: false, skipped: true, errors: [] };
    const receipt = result?.decision?.receipt;
    if (!receipt) return { ok: false, consumed: false, errors: ['authorization result has no decision receipt'] };
    return consumeExecutionGrant(receipt, adaptAction(input, { ...options, ...consumeOptions }), policy,
      consumeOptions.receiptSecret ?? options.receiptSecret, {
        storeDir: consumedStore,
        requireSignature: Boolean(consumeOptions.receiptSecret ?? options.receiptSecret),
        audience: consumeOptions.receiptAudience || receiptAudience,
        executor: consumeOptions.executor || 'ruleoak-sdk',
        now: consumeOptions.now,
        consumedAt: consumeOptions.consumedAt
      });
  }

  function guardFunction(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') throw new TypeError('ruleoak.guardFunction requires a descriptor');
    if (typeof descriptor.execute !== 'function') throw new TypeError('ruleoak.guardFunction descriptor.execute must be a function');
    const execute = descriptor.execute;
    const name = descriptor.name || execute.name || 'custom.execute';
    return async function ruleoakGuardedFunction(...args) {
      const request = typeof descriptor.buildRequest === 'function'
        ? await descriptor.buildRequest(args)
        : {
            actor: descriptor.actor || defaultActor,
            action: { name, category: descriptor.category, operation: descriptor.operation },
            resource: { resource: typeof descriptor.resource === 'function' ? descriptor.resource(args) : descriptor.resource || descriptor.target || name, scope: descriptor.scope, sensitivity: descriptor.sensitivity },
            arguments: typeof descriptor.mapArguments === 'function' ? descriptor.mapArguments(args) : { args },
            context: { ...object(options.context), ...object(descriptor.context), guarded_function: name }
          };
      const authorization = await authorize(request, descriptor.authorizationOptions || {});
      if (authorization.decision.action !== 'allow') throw effectiveAuthorizationError(authorization);
      let lease = null, consumption = { ok: true, consumed: false, skipped: true, errors: [] };
      if (receiptMode === 'automatic') {
        const leaseOptions = { secret: executionSecret, issuedAt: new Date().toISOString(), ttlMs: descriptor.executionLeaseTtlMs || options.executionLeaseTtlMs || 30000, approvalRequest: authorization.approval || undefined, approvalResult: authorization.approval_result || undefined, approvalUseStoreDir: approvalUseStore, approvalSecret: descriptor.authorizationOptions?.approvalSecret ?? options.approvalSecret, requireApprovalSignature: Boolean(descriptor.authorizationOptions?.requireApprovalSignature ?? options.requireApprovalSignature) };
        lease = authorization.approval_result ? issueExecutionLease(authorization, policy, leaseOptions) : buildExecutionLease(authorization, policy, leaseOptions);
        consumption = consumeExecutionLease(lease, adaptAction(request, { ...options, ...(descriptor.authorizationOptions || {}) }), policy, { secret: executionSecret, storeDir: consumedLeaseStore, executor: `sdk:${name}` });
      }
      if (!consumption.ok) {
        const denied = { ...authorization, decision: { ...authorization.decision, action: 'deny', reason: consumption.errors.join('; '), matchedRule: consumption.replayed ? 'execution-lease:replay-denied' : 'execution-lease:invalid' } };
        throw effectiveAuthorizationError(denied);
      }
      const mappedForEffect = object(request?.arguments);
      const effectContract = inferEffectKind(descriptor, request) === 'filesystem'
        ? inferFilesystemEffectContract({ name, operation: descriptor.operation || request?.action?.operation || request?.tool?.operation || name, ...mappedForEffect, path: descriptor.effectPath ? (typeof descriptor.effectPath === 'function' ? descriptor.effectPath(args) : descriptor.effectPath) : mappedForEffect.path || request?.resource?.resource || request?.target?.resource, idempotent: descriptor.idempotent === true || mappedForEffect.idempotent === true }, { maxHashBytes: descriptor.maxEffectHashBytes || options.maxEffectHashBytes, allowedRoots: descriptor.effectRoots || options.effectRoots })
        : null;
      const startedAt = new Date().toISOString();
      let value, executionError = null;
      try { value = await Reflect.apply(execute, this, args); } catch (error) { executionError = error; }
      const completedAt = new Date().toISOString();
      let effectReceipt = null, effectVerification = null, retryDecision = null, effectEvent = null, effectStateFile = null;
      if (lease) {
        const returned = !executionError;
        effectReceipt = buildEffectReceipt(lease, { status: 'unknown', observation_quality: returned ? 'process_return_observed' : 'ambiguous', requested: { tool: name, operation: descriptor.operation || null, target: request?.resource?.resource || request?.target?.resource || descriptor.target || null }, observed: { function_returned: returned, result_type: returned ? typeof value : null }, error: safeErrorRecord(executionError) }, { adapter: 'ruleoak-sdk-guard', adapterContractVersion: '1.1', observationBoundary: returned ? 'guarded-function-return' : 'guarded-function-exception', startedAt, completedAt });
        const rawVerification = await verifyGuardedEffect(descriptor, request, args, value, executionError, effectReceipt, effectContract);
        effectVerification = buildEffectVerificationRecord(effectReceipt, rawVerification, { lease, actionDigest: lease.action_digest, verifiedAt: completedAt });
        retryDecision = decideEffectRetry(effectReceipt, effectVerification, { lease });
        const verifierSpec = effectContract?.verifier_spec || null;
        const effectBindingDigest=canonicalDigest({effect_profile:null,effect_contract:effectContract||null,verifier_spec:verifierSpec});
        effectEvent = recorder.append({ type: 'ruleoak.effect.sdk', target: name, arguments: {}, metadata: { lease_id: lease.lease_id, effect_id: effectReceipt.effect_id, action_digest: lease.action_digest, side_effect: true } }, { action: 'allow', reason: retryDecision.reason, matchedRule: `effect:${retryDecision.disposition}` }, completedAt, { eventType: 'ruleoak.effect.sdk', effectReceipt, ledgerPayload: { effect_verification: effectVerification, retry_decision: retryDecision, effect_binding_digest:effectBindingDigest } });
        effectStateFile = persistEffectState(workspace, { effect_receipt: effectReceipt, effect_verification: effectVerification, retry_decision: retryDecision, execution_lease: lease, lease_binding: { lease_id: lease.lease_id, decision_id: lease.decision_id, action_digest: lease.action_digest }, effect_profile:null, effect_contract: effectContract, verifier_spec: verifierSpec, effect_binding_digest:effectBindingDigest });
      }
      const metadata = { decision_id: authorization.decision.receipt?.decision_id || null, evidence_event_id: authorization.evidence.final_event_id, effect_evidence_event_id: effectEvent?.event_id || null, action_digest: lease?.action_digest || authorization.decision.receipt?.action_digest || null, policy_digest: lease?.policy_digest || authorization.decision.receipt?.policy_digest || null, lease_id: lease?.lease_id || null, effect_id: effectReceipt?.effect_id || null, effect_state: effectVerification?.state || null, retry_disposition: retryDecision?.disposition || null, fresh_authority_required: retryDecision?.requires_new_authority ?? null, effect_state_file: effectStateFile, consumed: Boolean(consumption.consumed), consumption_record: consumption.markerPath || null };
      lastExecution = metadata;
      if (typeof options.onExecution === 'function') await options.onExecution(metadata, authorization, executionError ? null : value);
      if (executionError) { try { executionError.ruleoak = metadata; } catch {} throw executionError; }
      return decorateResult(value, metadata, descriptor.resultMode || options.resultMode || 'preserve');
    };
  }

  function guardTools(tools, guardOptions = {}) {
    if (Array.isArray(tools)) {
      return tools.map((tool, index) => {
        const name = tool?.function?.name || tool?.name || tool?.id || String(index);
        const execute = tool?.execute || tool?.invoke || tool?.handler || guardOptions.executors?.[name];
        if (typeof execute !== 'function') return { ...tool };
        const wrapped = guardFunction({
          ...tool,
          ...guardOptions,
          name,
          execute,
          mapArguments: tool.mapArguments || guardOptions.mapArguments
        });
        if (tool.execute) return { ...tool, execute: wrapped };
        if (tool.invoke) return { ...tool, invoke: wrapped };
        if (tool.handler) return { ...tool, handler: wrapped };
        return { ...tool, execute: wrapped };
      });
    }
    const output = {};
    for (const [name, tool] of Object.entries(object(tools))) {
      if (typeof tool === 'function') output[name] = guardFunction({ ...guardOptions, name, execute: tool });
      else if (tool && typeof tool === 'object') {
        const execute = tool.execute || tool.invoke || tool.handler;
        if (typeof execute !== 'function') output[name] = { ...tool };
        else {
          const wrapped = guardFunction({ ...guardOptions, ...tool, name, execute });
          output[name] = tool.execute ? { ...tool, execute: wrapped }
            : tool.invoke ? { ...tool, invoke: wrapped }
              : { ...tool, handler: wrapped };
        }
      } else output[name] = tool;
    }
    return output;
  }

  return {
    workspace,
    policy,
    evidenceFile,
    receiptMode,
    authorize,
    consume,
    guardFunction,
    guardTools,
    adapters: {
      authorization: (request, adapterOptions = {}) => adaptAuthorizationRequest(request, { ...options, ...adapterOptions }),
      openai: (call, adapterOptions = {}) => adaptOpenAIToolCall(call, { ...options, ...adapterOptions }),
      mcp: (call, adapterOptions = {}) => adaptMcpToolCall(call, { ...options, ...adapterOptions }),
      shell: (command, args = [], adapterOptions = {}) => adaptShellCommand(command, args, { ...options, ...adapterOptions }),
      filesystem: (operation, path, args = {}, adapterOptions = {}) => adaptFilesystemAction(operation, path, args, { ...options, ...adapterOptions }),
      http: (request, adapterOptions = {}) => adaptHttpAction(request, { ...options, ...adapterOptions })
    },
    authorizeOpenAIToolCall: (call, callOptions = {}) => authorize(adaptOpenAIToolCall(call, { ...options, ...callOptions }), callOptions),
    authorizeMcpToolCall: (call, callOptions = {}) => authorize(adaptMcpToolCall(call, { ...options, ...callOptions }), callOptions),
    get lastExecution() { return lastExecution; }
  };
}
