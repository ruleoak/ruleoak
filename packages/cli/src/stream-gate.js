/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildDecisionReceipt, consumeExecutionGrant, evaluatePermissionRequest } from '@ruleoak/core';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function isRuleOakRouteProbe(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.jsonrpc === '2.0' && value.method === 'ruleoak/route-probe');
}

export function routeProbeResponse(payload) {
  if (payload?.id === undefined) return null;
  return { jsonrpc: '2.0', id: payload.id, result: { ruleoakRouteProbe: 'active', boundary: 'mcp-stdio', forwarded: false } };
}

export function isJsonRpcToolCall(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.jsonrpc === '2.0' && value.method === 'tools/call');
}

export function isJsonRpcNotification(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.jsonrpc === '2.0' && typeof value.method === 'string' && value.id === undefined);
}

export function actionFromJsonRpcToolCall(payload) {
  const params = payload.params || {};
  const toolName = params.name || params.tool || 'unknown_tool';
  const argumentsObject = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments : {};
  const normalizedName = String(toolName).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[.:/\\-]+/g, '_');
  const segments = String(toolName).split(/[.:/]/);
  const rawCategory = String(segments[0] || 'custom').toLowerCase();
  let operation = 'execute';
  if (/^(read|get|list|search|query|echo|inspect|describe)(?:_|$)/.test(normalizedName)) operation = 'read';
  else if (/^(write|save|put)(?:_|$)/.test(normalizedName)) operation = 'write';
  else if (/^(edit|patch|update)(?:_|$)/.test(normalizedName)) operation = 'edit';
  else if (/^(create|mkdir|make)(?:_|$)/.test(normalizedName)) operation = 'create';
  else if (/^(move|rename)(?:_|$)/.test(normalizedName)) operation = 'move';
  else if (/^(delete|remove|unlink|rmdir)(?:_|$)/.test(normalizedName)) operation = 'delete';
  else if (/^(send)(?:_|$)/.test(normalizedName)) operation = 'send';
  else if (segments.length > 1) operation = String(segments.at(-1) || 'execute').toLowerCase();

  let category = ['file','shell','email','web','memory','payment','calendar','git'].includes(rawCategory) ? rawCategory : rawCategory === 'filesystem' ? 'file' : 'custom';
  if (category === 'custom' && /(file|directory|filesystem|mkdir)/.test(normalizedName)) category = 'file';
  else if (category === 'custom' && /(^|_)git(_|$)/.test(normalizedName)) category = 'git';
  else if (category === 'custom' && /(^|_)(shell|process|command)(_|$)/.test(normalizedName)) category = 'shell';
  const target = argumentsObject.path || argumentsObject.source || argumentsObject.destination || argumentsObject.target || argumentsObject.url || argumentsObject.to || toolName;
  const external = ['email', 'web', 'payment', 'calendar'].includes(category) || operation === 'send';
  return {
    type: `mcp.${toolName}`,
    target: String(target),
    arguments: argumentsObject,
    metadata: {
      jsonrpcId: payload.id,
      method: payload.method,
      category,
      operation,
      scope: external ? 'external' : 'local',
      sensitivity: argumentsObject.sensitivity || 'unknown',
      actorType: 'agent',
      agent: 'mcp-client',
      protocol: 'mcp-jsonrpc-stdio'
    }
  };
}

export function denialResponse(payload, decision) {
  if (isJsonRpcNotification(payload)) return null;
  const approvalRequired = decision.action === 'needs_approval';
  return {
    jsonrpc: '2.0',
    id: payload?.id ?? null,
    error: {
      code: approvalRequired ? -32002 : -32001,
      message: approvalRequired
        ? `[RuleOak Firewall] Action requires approval: ${decision.reason}`
        : `[RuleOak Firewall] Action denied by policy rule: ${decision.matchedRule || decision.matchedPattern || decision.reason}`,
      data: {
        ruleoakDecision: decision.action,
        reason: decision.reason,
        matchedRule: decision.matchedRule || decision.matchedPattern || null,
        risk: decision.risk || null,
        decisionId: decision.receipt?.decision_id || null,
        retryableAfterApproval: approvalRequired
      }
    }
  };
}

export function parseErrorResponse(message = 'Invalid JSON-RPC payload intercepted by RuleOak') {
  return { jsonrpc: '2.0', id: null, error: { code: -32700, message } };
}

function findNextJsonStart(text, from = 0) {
  const obj = text.indexOf('{', from);
  const arr = text.indexOf('[', from);
  if (obj < 0) return arr;
  if (arr < 0) return obj;
  return Math.min(obj, arr);
}

function findJsonEnd(text, start) {
  const open = text[start];
  const closeFor = open === '{' ? '}' : ']';
  const stack = [closeFor];
  let inString = false;
  let escaped = false;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.length === 0 || ch !== stack[stack.length - 1]) return { end: i + 1, malformed: true };
      stack.pop();
      if (stack.length === 0) return { end: i + 1, malformed: false };
    }
  }
  return { end: -1, malformed: false };
}

export function extractJsonFragments(buffer) {
  const fragments = [];
  let pos = 0;
  while (pos < buffer.length) {
    const start = findNextJsonStart(buffer, pos);
    if (start < 0) {
      const rest = buffer.slice(pos);
      // Keep a trailing non-newline fragment in the buffer. It may be the prefix of later noise or JSON.
      const lastNewline = Math.max(rest.lastIndexOf('\n'), rest.lastIndexOf('\r'));
      if (lastNewline >= 0) {
        fragments.push({ kind: 'noise', raw: rest.slice(0, lastNewline + 1) });
        return { fragments, remaining: rest.slice(lastNewline + 1) };
      }
      return { fragments, remaining: rest };
    }
    if (start > pos) {
      fragments.push({ kind: 'noise', raw: buffer.slice(pos, start) });
    }
    const { end, malformed } = findJsonEnd(buffer, start);
    if (end < 0) return { fragments, remaining: buffer.slice(start) };
    const raw = buffer.slice(start, end);
    if (malformed) {
      fragments.push({ kind: 'malformed-json', raw });
    } else {
      try { fragments.push({ kind: 'json', raw, value: JSON.parse(raw) }); }
      catch { fragments.push({ kind: 'malformed-json', raw }); }
    }
    pos = end;
  }
  return { fragments, remaining: '' };
}

export class RuleOakInboundGate {
  constructor({ engine, policy, recorder, fixedTimestamp, receiptSecret, receiptAudience = 'ruleoak-executor', autoConsumeReceipts = false, consumedReceiptsDir, approvalHandler, sessionDecisionCacheProvider, onEvaluation, beforeForward, stderr = process.stderr, stdout = process.stdout, childStdin }) {
    this.engine = engine;
    this.policy = policy || engine?.policy || null;
    this.recorder = recorder;
    this.receiptSecret = receiptSecret;
    this.receiptAudience = receiptAudience;
    this.autoConsumeReceipts = autoConsumeReceipts;
    this.consumedReceiptsDir = consumedReceiptsDir;
    this.approvalHandler = approvalHandler;
    this.sessionDecisionCacheProvider = sessionDecisionCacheProvider;
    this.onEvaluation = onEvaluation;
    this.beforeForward = beforeForward;
    this.fixedTimestamp = fixedTimestamp;
    this.stderr = stderr;
    this.stdout = stdout;
    this.childStdin = childStdin;
    this.buffer = '';
  }

  async write(chunk) {
    this.buffer += String(chunk);
    const parsed = extractJsonFragments(this.buffer);
    this.buffer = parsed.remaining;
    for (const fragment of parsed.fragments) await this.#handleFragment(fragment);
  }

  async end() {
    const tail = this.buffer;
    this.buffer = '';
    if (tail.length > 0) {
      const trimmed = tail.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        this.#emitClientResponse(parseErrorResponse('Incomplete JSON-RPC payload intercepted by RuleOak'));
        this.stderr.write('\n🛑 [RuleOak Blocked]: incomplete JSON-like stdin payload was not forwarded.\n');
      } else {
        this.childStdin.write(tail);
      }
    }
    this.childStdin.end();
  }

  async #handleFragment(fragment) {
    if (fragment.kind === 'noise') {
      this.childStdin.write(fragment.raw);
      return;
    }
    if (fragment.kind === 'malformed-json') {
      this.#emitClientResponse(parseErrorResponse());
      this.stderr.write('\n🛑 [RuleOak Blocked]: malformed JSON-like stdin payload was not forwarded.\n');
      return;
    }
    await this.#handleJson(fragment.value, fragment.raw);
  }

  async #handleJson(value, raw) {
    if (Array.isArray(value)) {
      const allowed = [];
      const responses = [];
      for (const item of value) {
        const result = await this.#evaluateJsonRpcItem(item);
        if (result.forward) allowed.push(item);
        else if (result.response) responses.push(result.response);
      }
      if (allowed.length > 0) this.childStdin.write(`${JSON.stringify(allowed)}\n`);
      if (responses.length > 0) this.#emitClientResponse(responses);
      return;
    }
    const result = await this.#evaluateJsonRpcItem(value);
    if (result.forward) this.childStdin.write(`${raw}\n`);
    else if (result.response) this.#emitClientResponse(result.response);
  }

  async #evaluateJsonRpcItem(item) {
    if (isRuleOakRouteProbe(item)) return { forward: false, response: routeProbeResponse(item), routeProbe: true };
    if (!isJsonRpcToolCall(item)) return { forward: true };
    const inputAction = actionFromJsonRpcToolCall(item);
    const evaluatedAt = this.fixedTimestamp || new Date().toISOString();
    const sessionCache = typeof this.sessionDecisionCacheProvider === 'function'
      ? await this.sessionDecisionCacheProvider(inputAction)
      : undefined;
    let result = this.policy
      ? evaluatePermissionRequest(inputAction, this.policy, {
          evaluatedAt,
          receiptSecret: this.receiptSecret,
          receiptAudience: this.receiptAudience,
          sessionDecisionCache: sessionCache
        })
      : { action: inputAction, decision: this.engine.evaluate(inputAction), normalizedCall: inputAction, classification: {} };
    let action = result.action || inputAction;
    let decision = result.decision;
    this.recorder.writeEvent(action, decision, decision.matchedRule || decision.matchedPattern, evaluatedAt);
    if (typeof this.onEvaluation === 'function') await this.onEvaluation(result, { item, inputAction, evaluatedAt });

    if (decision.action === 'needs_approval' && typeof this.approvalHandler === 'function') {
      const approvalResult = await this.approvalHandler({ item, inputAction, result, action, decision, evaluatedAt, policy: this.policy });
      const approvalDecision = typeof approvalResult === 'string'
        ? approvalResult
        : approvalResult?.decision || approvalResult?.action || 'deny';
      if (approvalDecision === 'needs_approval') {
        decision = { ...decision, approvalId: approvalResult?.approvalId || approvalResult?.approval_id || null };
        result = { ...result, decision };
      } else {
      const allow = ['allow', 'allow_once', 'allow_session', 'always_allow'].includes(approvalDecision);
      const finalDecision = {
        action: allow ? 'allow' : 'deny',
        reason: approvalResult?.reason || `${approvalDecision} through ${approvalResult?.channel || 'interactive approval'}`,
        matchedRule: `approval:${approvalDecision}`,
        approvalId: approvalResult?.approvalId || approvalResult?.approval_id || null,
        risk: result.classification?.risk || decision.risk || 'unknown',
        trace: [...(decision.trace || []), { stage: 'approval', channel: approvalResult?.channel || 'interactive', decision: approvalDecision }]
      };
      finalDecision.receipt = buildDecisionReceipt({ ...result, decision: finalDecision }, this.policy || {}, {
        evaluatedAt,
        secret: this.receiptSecret,
        audience: this.receiptAudience,
        oneTime: true
      });
      decision = finalDecision;
      result = { ...result, decision };
      this.recorder.writeEvent(action, decision, decision.matchedRule, evaluatedAt);
      if (typeof this.onEvaluation === 'function') await this.onEvaluation(result, { item, inputAction, evaluatedAt, approvalDecision: true });
      }
    }

    if (decision.action === 'allow' && this.autoConsumeReceipts) {
      const consumption = consumeExecutionGrant(decision.receipt, inputAction, this.policy || {}, this.receiptSecret, {
        storeDir: this.consumedReceiptsDir,
        requireSignature: Boolean(this.receiptSecret),
        audience: this.receiptAudience,
        executor: 'ruleoak-protect',
        now: evaluatedAt,
        consumedAt: evaluatedAt
      });
      const consumptionDecision = {
        action: consumption.ok ? 'allow' : 'deny',
        reason: consumption.ok ? 'one-time execution grant consumed automatically' : (consumption.errors || []).join('; '),
        matchedRule: consumption.replayed ? 'execution-grant:replay-denied' : consumption.ok ? 'execution-grant:auto-consumed' : 'execution-grant:invalid',
        decisionId: decision.receipt?.decision_id || null
      };
      this.recorder.writeEvent({
        type: 'ruleoak.receipt.consume',
        target: decision.receipt?.decision_id || '',
        arguments: {},
        metadata: {
          action_digest: decision.receipt?.action_digest || null,
          policy_digest: decision.receipt?.policy_digest || null,
          automatic: true,
          replayed: Boolean(consumption.replayed)
        }
      }, consumptionDecision, consumptionDecision.matchedRule, evaluatedAt);
      if (!consumption.ok) {
        const blocked = { ...decision, action: 'deny', reason: consumptionDecision.reason, matchedRule: consumptionDecision.matchedRule };
        return { forward: false, response: denialResponse(item, blocked), decision: blocked, consumption };
      }
    }

    if (decision.action === 'allow') {
      if (typeof this.beforeForward === 'function') {
        const gate = await this.beforeForward({ item, inputAction, result, action, decision, evaluatedAt });
        if (gate?.allow === false) {
          const blocked = { ...decision, ...(gate.decision || {}), action: 'deny' };
          this.recorder.writeEvent(action, blocked, blocked.matchedRule || 'effect:pre-forward-block', evaluatedAt);
          return { forward: false, response: denialResponse(item, blocked), decision: blocked, preForward: gate };
        }
      }
      return { forward: true, decision };
    }

    const response = denialResponse(item, decision);
    const verb = decision.action === 'needs_approval' ? 'requires approval and was not forwarded without out-of-band approval' : 'was denied before it reached the child process';
    const notificationNote = isJsonRpcNotification(item) ? ' JSON-RPC notifications do not receive responses.' : '';
    this.stderr.write(`\n🛑 [RuleOak Blocked Before Forward]: ${action.type} ${verb}.${notificationNote}\n`);
    return { forward: false, response, decision };
  }

  #emitClientResponse(payload) {
    this.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}


/**
 * Parse child stdout without changing its JSON payloads. Matching JSON-RPC responses
 * may be observed before they are forwarded to the client so an execution boundary
 * can persist effect evidence before control returns to the agent.
 */
export class RuleOakOutboundGate {
  constructor({ stdout = process.stdout, onJson, onMalformed }) {
    this.stdout = stdout;
    this.onJson = onJson;
    this.onMalformed = onMalformed;
    this.buffer = '';
  }
  async write(chunk) {
    this.buffer += String(chunk);
    const parsed = extractJsonFragments(this.buffer);
    this.buffer = parsed.remaining;
    for (const fragment of parsed.fragments) {
      if (fragment.kind === 'json') {
        if (typeof this.onJson === 'function') await this.onJson(fragment.value);
        this.stdout.write(fragment.raw);
      } else if (fragment.kind === 'malformed-json') {
        if (typeof this.onMalformed === 'function') await this.onMalformed(fragment.raw);
        this.stdout.write(fragment.raw);
      } else this.stdout.write(fragment.raw);
    }
  }
  async end() {
    if (this.buffer) this.stdout.write(this.buffer);
    this.buffer = '';
  }
}
