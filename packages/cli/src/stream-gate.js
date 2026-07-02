/*
 * Copyright © 2026 The RuleOak Authors.
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
 * SPDX-FileCopyrightText: 2026 The RuleOak Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function isJsonRpcToolCall(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.jsonrpc === '2.0' && value.method === 'tools/call');
}

export function actionFromJsonRpcToolCall(payload) {
  const params = payload.params || {};
  const toolName = params.name || params.tool || 'unknown_tool';
  return {
    type: `mcp.${toolName}`,
    target: toolName,
    arguments: params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments : {},
    metadata: { jsonrpcId: payload.id, method: payload.method }
  };
}

export function denialResponse(payload, decision) {
  return {
    jsonrpc: '2.0',
    id: payload?.id ?? null,
    error: {
      code: -32603,
      message: `[RuleOak Firewall] Action denied by policy rule: ${decision.matchedRule || decision.matchedPattern || decision.reason}`,
      data: {
        ruleoakDecision: decision.action,
        reason: decision.reason,
        matchedRule: decision.matchedRule || decision.matchedPattern || null
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
  constructor({ engine, recorder, fixedTimestamp, stderr = process.stderr, stdout = process.stdout, childStdin }) {
    this.engine = engine;
    this.recorder = recorder;
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
      for (const item of value) {
        const result = this.#evaluateJsonRpcItem(item);
        if (result.forward) allowed.push(item);
      }
      if (allowed.length > 0) this.childStdin.write(`${JSON.stringify(allowed)}\n`);
      return;
    }
    const result = this.#evaluateJsonRpcItem(value);
    if (result.forward) this.childStdin.write(`${raw}\n`);
  }

  #evaluateJsonRpcItem(item) {
    if (!isJsonRpcToolCall(item)) return { forward: true };
    const action = actionFromJsonRpcToolCall(item);
    const decision = this.engine.evaluate(action);
    this.recorder.writeEvent(action, decision, decision.matchedRule || decision.matchedPattern, this.fixedTimestamp || new Date().toISOString());

    if (decision.action === 'allow') return { forward: true };

    const response = denialResponse(item, decision);
    this.#emitClientResponse(response);
    const verb = decision.action === 'needs_approval' ? 'requires approval and was not forwarded without out-of-band approval' : 'was denied before it reached the child process';
    this.stderr.write(`\n🛑 [RuleOak Blocked Before Forward]: ${action.type} ${verb}.\n`);
    return { forward: false };
  }

  #emitClientResponse(payload) {
    this.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}
