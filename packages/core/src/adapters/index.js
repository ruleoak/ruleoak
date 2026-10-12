/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { evaluatePermissionRequest } from '../permission/gateway.js';
import { annotateAdapterContract } from './conformance.js';

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function actorFrom(options = {}) {
  const actor = object(options.actor);
  return {
    type: actor.type || options.actorType || 'agent',
    name: actor.name || options.actorName || 'unknown-agent',
    session_id: actor.session_id || options.sessionId || 'default-session'
  };
}

function unknownFields(source, known) {
  const output = {};
  for (const [key, value] of Object.entries(object(source))) if (!known.has(key)) output[key] = value;
  return output;
}

const KNOWN_CATEGORIES = new Set(['file', 'filesystem', 'shell', 'email', 'web', 'memory', 'payment', 'calendar', 'custom']);

function normalizeCategory(category = 'custom') {
  const value = category === 'filesystem' ? 'file' : String(category || 'custom');
  return KNOWN_CATEGORIES.has(value) ? value : 'custom';
}

function categoryFromName(name = '') {
  return normalizeCategory(String(name).includes('.') ? String(name).split('.')[0] : 'custom');
}

function inferOperation(name = '') {
  const terminal = String(name).split('.').at(-1)?.toLowerCase() || 'execute';
  if (['read', 'get', 'list', 'search', 'query', 'inspect', 'describe'].includes(terminal)) return 'read';
  if (['delete', 'remove', 'destroy'].includes(terminal)) return 'delete';
  if (['write', 'update', 'create', 'send', 'execute', 'run'].includes(terminal)) return terminal === 'run' ? 'execute' : terminal;
  return 'execute';
}

function scopeForCategory(category, operation, options = {}) {
  if (options.scope) return options.scope;
  if (['email', 'web', 'payment', 'calendar', 'http'].includes(category) || operation === 'send') return 'external';
  if (['file', 'shell', 'memory'].includes(category)) return 'local';
  return 'unknown';
}

function buildCall({ name, category, operation, target, arguments: args, context = {}, actor, callId, timestamp, scope, sensitivity }) {
  const toolCategory = normalizeCategory(category || String(name || 'custom.execute').split('.')[0] || 'custom');
  const toolOperation = operation || inferOperation(name);
  const call = {
    call_id: callId || `call_${Date.now()}`,
    timestamp: timestamp || new Date().toISOString(),
    actor: actorFrom({ actor }),
    tool: {
      name: String(name || `${toolCategory}.${toolOperation}`),
      category: toolCategory,
      operation: toolOperation
    },
    target: {
      resource: String(target || ''),
      scope: scope || scopeForCategory(toolCategory, toolOperation),
      sensitivity: sensitivity || 'unknown'
    },
    arguments: object(args),
    context: object(context)
  };
  return annotateAdapterContract(call, call.context?.adapter);
}

export function adaptAuthorizationRequest(request = {}, options = {}) {
  const source = object(request);
  const action = typeof source.action === 'string' ? { name: source.action } : object(source.action);
  const resource = typeof source.resource === 'string' ? { resource: source.resource } : object(source.resource);
  const name = action.name || action.type || source.type || source.tool || 'custom.execute';
  const category = action.category || source.category || categoryFromName(name);
  const operation = action.operation || source.operation || inferOperation(name);
  const target = resource.resource || resource.target || source.target || source.path || source.url || '';
  const preserved = unknownFields(source, new Set(['actor', 'action', 'resource', 'arguments', 'context', 'type', 'tool', 'category', 'operation', 'target', 'path', 'url', 'call_id', 'timestamp', 'scope', 'sensitivity']));
  return buildCall({
    name,
    category,
    operation,
    target,
    arguments: source.arguments,
    actor: source.actor || options.actor,
    callId: source.call_id || options.callId,
    timestamp: source.timestamp || options.timestamp,
    scope: resource.scope || source.scope || options.scope,
    sensitivity: resource.sensitivity || source.sensitivity || options.sensitivity,
    context: {
      ...object(source.context),
      ...object(options.context),
      adapter: 'authorization-request',
      adapter_metadata: preserved
    }
  });
}

export function adaptOpenAIToolCall(payload = {}, options = {}) {
  const source = object(payload);
  const fn = object(source.function);
  let args = fn.arguments ?? source.arguments ?? {};
  if (typeof args === 'string') {
    try { args = JSON.parse(args); }
    catch { args = { raw_arguments: args }; }
  }
  const name = fn.name || source.name || source.tool_name || 'unknown_tool';
  const category = options.category || categoryFromName(name);
  const operation = options.operation || inferOperation(name);
  const target = options.target || object(args).path || object(args).target || object(args).url || object(args).to || name;
  return buildCall({
    name,
    category,
    operation,
    target,
    arguments: args,
    actor: options.actor,
    callId: source.id || options.callId,
    timestamp: options.timestamp,
    scope: options.scope || scopeForCategory(normalizeCategory(category), operation),
    sensitivity: options.sensitivity || object(args).sensitivity,
    context: {
      ...object(options.context),
      adapter: 'openai-tool-call',
      adapter_metadata: unknownFields(source, new Set(['id', 'type', 'function', 'name', 'tool_name', 'arguments']))
    }
  });
}

export function adaptMcpToolCall(payload = {}, options = {}) {
  const source = object(payload);
  const params = object(source.params);
  const args = object(params.arguments);
  const name = params.name || params.tool || source.name || 'unknown_tool';
  const category = options.category || categoryFromName(name);
  const operation = options.operation || inferOperation(name);
  const target = options.target || args.path || args.target || args.url || args.to || name;
  return buildCall({
    name: `mcp.${name}`,
    category,
    operation,
    target,
    arguments: args,
    actor: options.actor || { type: 'agent', name: 'mcp-client', session_id: options.sessionId || `jsonrpc-${source.id ?? 'notification'}` },
    callId: options.callId || `mcp_${source.id ?? Date.now()}`,
    timestamp: options.timestamp,
    scope: options.scope || scopeForCategory(normalizeCategory(category), operation),
    sensitivity: options.sensitivity || args.sensitivity,
    context: {
      ...object(options.context),
      adapter: 'mcp-tools-call',
      jsonrpc_id: source.id ?? null,
      method: source.method || 'tools/call',
      protocol_version: object(params._meta).protocolVersion || params.protocolVersion || null,
      is_notification: source.id === undefined,
      adapter_metadata: unknownFields(source, new Set(['jsonrpc', 'id', 'method', 'params', 'name']))
    }
  });
}

export function adaptShellCommand(command, args = [], options = {}) {
  const argv = Array.isArray(args) ? args.map(String) : [];
  return buildCall({
    name: options.name || 'shell.execute',
    category: 'shell',
    operation: 'execute',
    target: options.target || String(command || ''),
    arguments: { command: String(command || ''), args: argv, cwd: options.cwd || undefined },
    actor: options.actor,
    callId: options.callId,
    timestamp: options.timestamp,
    scope: options.scope || 'local',
    sensitivity: options.sensitivity || 'unknown',
    context: { ...object(options.context), adapter: 'shell-command', adapter_metadata: object(options.metadata) }
  });
}

export function adaptFilesystemAction(operation, path, args = {}, options = {}) {
  const normalizedOperation = operation === 'remove' ? 'delete' : operation || 'read';
  return buildCall({
    name: options.name || `filesystem.${normalizedOperation}`,
    category: 'file',
    operation: normalizedOperation,
    target: String(path || ''),
    arguments: { ...object(args), path: String(path || '') },
    actor: options.actor,
    callId: options.callId,
    timestamp: options.timestamp,
    scope: options.scope || 'local',
    sensitivity: options.sensitivity || 'unknown',
    context: { ...object(options.context), adapter: 'filesystem-action', adapter_metadata: object(options.metadata) }
  });
}

export function adaptHttpAction(request = {}, options = {}) {
  const source = object(request);
  const method = String(source.method || options.method || 'GET').toUpperCase();
  const operation = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? 'read' : 'send';
  return buildCall({
    name: options.name || `http.${method.toLowerCase()}`,
    category: 'web',
    operation,
    target: source.url || options.url || '',
    arguments: {
      method,
      url: source.url || options.url || '',
      headers: object(source.headers),
      body: source.body
    },
    actor: options.actor,
    callId: options.callId,
    timestamp: options.timestamp,
    scope: 'external',
    sensitivity: options.sensitivity || source.sensitivity || 'unknown',
    context: {
      ...object(options.context),
      adapter: 'http-action',
      adapter_metadata: unknownFields(source, new Set(['method', 'url', 'headers', 'body', 'sensitivity']))
    }
  });
}

export function adaptAction(input, options = {}) {
  if (options.adapter === 'openai') return adaptOpenAIToolCall(input, options);
  if (options.adapter === 'mcp') return adaptMcpToolCall(input, options);
  if (options.adapter === 'http') return adaptHttpAction(input, options);
  if (input?.jsonrpc === '2.0' && input?.method === 'tools/call') return adaptMcpToolCall(input, options);
  if (input?.type === 'function' && input?.function) return adaptOpenAIToolCall(input, options);
  if (input?.action || input?.resource || options.adapter === 'authorization') return adaptAuthorizationRequest(input, options);
  return input;
}

export function authorize(request, options = {}) {
  const normalized = adaptAction(request, options);
  return evaluatePermissionRequest(normalized, options.policy || {}, options);
}

export class RuleOakAuthorizationError extends Error {
  constructor(result) {
    super(`RuleOak authorization ${result?.decision?.action || 'failed'}: ${result?.decision?.reason || 'unknown reason'}`);
    this.name = 'RuleOakAuthorizationError';
    this.result = result;
  }
}

async function resolveApproval(result, options) {
  if (result.decision.action !== 'needs_approval') return result.decision.action;
  if (typeof options.onApproval !== 'function') return 'deny';
  const decision = await options.onApproval(result);
  return typeof decision === 'string' ? decision : decision?.action || decision?.decision || 'deny';
}

export function guardFunction(fn, descriptor = {}, options = {}) {
  if (typeof fn !== 'function') throw new TypeError('guardFunction requires a function');
  const name = descriptor.name || fn.name || 'custom.execute';
  return async function ruleoakGuardedFunction(...args) {
    const request = typeof descriptor.buildRequest === 'function'
      ? await descriptor.buildRequest(args)
      : {
          actor: options.actor,
          action: { name, category: descriptor.category, operation: descriptor.operation },
          resource: { resource: descriptor.target || name, scope: descriptor.scope, sensitivity: descriptor.sensitivity },
          arguments: typeof descriptor.mapArguments === 'function' ? descriptor.mapArguments(args) : { args },
          context: { ...object(options.context), guarded_function: name }
        };
    const result = authorize(request, options);
    if (typeof options.onDecision === 'function') await options.onDecision(result);
    let action = result.decision.action;
    if (action === 'needs_approval') action = await resolveApproval(result, options);
    if (!['allow', 'allow_once', 'allow_session', 'always_allow'].includes(action)) throw new RuleOakAuthorizationError(result);
    return await fn.apply(this, args);
  };
}

function executorKey(tool, index) {
  return tool?.function?.name || tool?.name || tool?.id || String(index);
}

export function guardTools(tools, options = {}) {
  if (Array.isArray(tools)) {
    return tools.map((tool, index) => {
      const key = executorKey(tool, index);
      const executor = tool?.execute || tool?.invoke || tool?.handler || options.executors?.[key];
      if (typeof executor !== 'function') return { ...tool };
      const wrapped = guardFunction(executor, {
        name: key,
        category: tool.category,
        operation: tool.operation,
        target: tool.target,
        sensitivity: tool.sensitivity,
        mapArguments: tool.mapArguments
      }, options);
      if (tool.execute) return { ...tool, execute: wrapped };
      if (tool.invoke) return { ...tool, invoke: wrapped };
      if (tool.handler) return { ...tool, handler: wrapped };
      return { ...tool, execute: wrapped };
    });
  }
  const output = {};
  for (const [name, value] of Object.entries(object(tools))) {
    if (typeof value === 'function') output[name] = guardFunction(value, { name }, options);
    else if (value && typeof value === 'object') {
      const executor = value.execute || value.invoke || value.handler;
      if (typeof executor !== 'function') output[name] = { ...value };
      else {
        const wrapped = guardFunction(executor, { name, ...value }, options);
        output[name] = value.execute ? { ...value, execute: wrapped } : value.invoke ? { ...value, invoke: wrapped } : { ...value, handler: wrapped };
      }
    } else output[name] = value;
  }
  return output;
}
