/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { adaptMcpToolCall, adapterDescriptor, buildEffectReceipt, canonicalDigest, buildEffectVerificationRecord, buildExecutionLease, buildMcpCapabilityPin, consumeExecutionLease, decideEffectRetry, EFFECT_VERIFICATION_STATES, evaluatePermissionRequest, inferMcpEffectContract, inspectMcpRequest, validateEffectReceiptAgainstAdapter, verifyFilesystemPostcondition, verifyGitPostcondition, verifyHttpPostcondition, verifyMcpToolCallAgainstPin, verifyProcessPostcondition } from '@ruleoak/core';
import { randomBytes } from 'node:crypto';
import { denialResponse, isJsonRpcToolCall } from './stream-gate.js';
import { persistEffectState } from './effect-state.js';


function safeGatewayError(error){return error?{name:String(error.name||'Error').slice(0,128),message:String(error.message||error).slice(0,2048),code:error.code==null?null:String(error.code).slice(0,128)}:null;}
function toolKind(item={}){const n=String(item?.params?.name||'').toLowerCase();if(n.startsWith('filesystem.')||n.startsWith('file.'))return'filesystem';if(n.startsWith('git.'))return'git';if(n.startsWith('http.')||n.startsWith('web.'))return'http';if(n.startsWith('shell.')||n.startsWith('process.'))return'process';return'unknown';}
async function verifyMcpEntryEffect(entry,effectReceipt,options={},context={}){
  if(typeof options.effectVerifier==='function')return invokeBounded(options.effectVerifier,[{entry,effectReceipt,context}],boundedHandlerTimeout(options.handlerTimeoutMs),'effect verifier');
  if(entry.effectContract?.verifier_spec?.kind==='filesystem'){const spec=entry.effectContract.verifier_spec;return verifyFilesystemPostcondition(spec,spec);}
  const args=entry.item?.params?.arguments||{};const name=String(entry.item?.params?.name||'');const operation=name.split('.').pop()||'execute';const retrySafe=args.idempotent===true||args.retry_safe===true;

  if(toolKind(entry.item)==='git')return verifyGitPostcondition({operation,...args,idempotent:retrySafe},{operation,repo:args.repo||args.cwd,expected:args.expected||args.postcondition,idempotent:retrySafe,allowNetwork:options.allowGitNetworkVerification===true});
  if(toolKind(entry.item)==='http')return verifyHttpPostcondition({operation,...args,idempotent:retrySafe},{probe:typeof options.httpPostconditionProbe==='function'?()=>options.httpPostconditionProbe({entry,effectReceipt,context}):undefined,responseStatus:context.upstreamStatus,idempotent:retrySafe});
  if(toolKind(entry.item)==='process')return verifyProcessPostcondition({operation,...args,idempotent:retrySafe},{exitCode:null,sideEffectFree:false,idempotent:retrySafe});
  return{state:EFFECT_VERIFICATION_STATES.UNKNOWN,reason:'no safe postcondition verifier is configured for this MCP tool effect',evidence:{effect_applied:null,retry_safe:false}};
}
async function finalizeMcpEffects(entries,options={},context={}){
  const results=[];
  for(const entry of entries.filter(x=>x.forward&&x.lease&&x.effectReceipt&&isJsonRpcToolCall(x.item))){
    const effect=entry.effectReceipt,raw=await verifyMcpEntryEffect(entry,effect,options,context);
    const verification=buildEffectVerificationRecord(effect,raw,{lease:entry.lease,actionDigest:entry.lease.action_digest,verifiedAt:new Date().toISOString()});
    const retry=decideEffectRetry(effect,verification,{lease:entry.lease});
    const verifierSpec=entry.effectContract?.verifier_spec||null;
    const effectProfile=options.effectProfile&&typeof options.effectProfile==='object'?{profile_version:options.effectProfile.profile_version||'1.0',profile_id:options.effectProfile.profile_id||'local-filesystem-explicit-v1',kind:options.effectProfile.kind,root_count:Array.isArray(options.effectProfile.roots)?options.effectProfile.roots.length:0,provenance:options.effectProfile.provenance||'explicit-reviewed-route',confidence:options.effectProfile.confidence||'explicit'}:null;
    const effectBindingDigest=canonicalDigest({effect_profile:effectProfile,effect_contract:entry.effectContract||null,verifier_spec:verifierSpec});
    options.recorder.append({type:'ruleoak.effect.mcp.verify',target:entry.item.params?.name||'',arguments:{},metadata:{lease_id:entry.lease.lease_id,effect_id:effect.effect_id,action_digest:entry.lease.action_digest,tool:entry.item.params?.name||null,side_effect:true}},{action:'allow',reason:retry.reason,matchedRule:`effect:${retry.disposition}`},verification.verified_at,{eventType:'ruleoak.effect.mcp.verified',effectReceipt:effect,ledgerPayload:{effect_verification:verification,retry_decision:retry,effect_binding_digest:effectBindingDigest}});
    entry.effectVerification=verification;entry.retryDecision=retry;
    try{persistEffectState(options.baseDir||process.cwd(),{effect_receipt:effect,effect_verification:verification,retry_decision:retry,execution_lease:entry.lease,lease_binding:{lease_id:entry.lease.lease_id,decision_id:entry.lease.decision_id,action_digest:entry.lease.action_digest},effect_profile:effectProfile,effect_contract:entry.effectContract||null,verifier_spec:verifierSpec,effect_binding_digest:effectBindingDigest});}catch{}
    results.push({effect,verification,retry});
  }
  return results;
}

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPSTREAM_JSON_BYTES = 2 * 1024 * 1024;
const MAX_BATCH_ITEMS = 256;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;
const DEFAULT_HANDLER_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_JSON_BYTES = 8 * 1024 * 1024;

export function parseListenAddress(value = '127.0.0.1:7331') {
  const text = String(value || '127.0.0.1:7331');
  const separator = text.lastIndexOf(':');
  if (separator <= 0) throw new Error(`invalid listen address: ${text}`);
  const host = text.slice(0, separator);
  const port = Number(text.slice(separator + 1));
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`invalid listen port: ${text}`);
  return { host, port };
}

export function isLoopbackHost(host) {
  const value = String(host || '').toLowerCase();
  return ['127.0.0.1', '::1', 'localhost'].includes(value) || value.startsWith('127.');
}

function sendJson(response, status, body, headers = {}) {
  if (response.headersSent) { response.destroy(); return; }
  const payload = JSON.stringify(body);
  if (Buffer.byteLength(payload) > MAX_RESPONSE_JSON_BYTES) throw Object.assign(new Error(`response JSON exceeds maxBytes (${MAX_RESPONSE_JSON_BYTES})`), { statusCode: 500 });
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...headers
  });
  response.end(payload);
}


function boundedHandlerTimeout(value) {
  const n = Number(value ?? DEFAULT_HANDLER_TIMEOUT_MS);
  if (!Number.isFinite(n) || n < 50 || n > 60_000) throw new Error('handlerTimeoutMs must be between 50 and 60000');
  return Math.floor(n);
}

async function invokeBounded(handler, args, timeoutMs, label) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => handler(...args, { signal: controller.signal })),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), { statusCode: 504 }));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request body too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error('invalid JSON request body'), { statusCode: 400 }); }
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireAuthorized(request, token) {
  if (!token) return true;
  return bearerToken(request) === token;
}

export function createAuthorizationApiServer(options = {}) {
  const listen = parseListenAddress(options.listen || '127.0.0.1:7331');
  if (!isLoopbackHost(listen.host) && !options.allowNonLoopback) {
    throw new Error('non-loopback binding requires --allow-non-loopback');
  }
  if (!isLoopbackHost(listen.host) && !options.token) {
    throw new Error('non-loopback binding requires bearer-token authentication');
  }
  for (const name of ['authorize', 'approve', 'consume', 'pending', 'health']) {
    if (typeof options[name] !== 'function') throw new Error(`authorization API handler missing: ${name}`);
  }

  const handlerTimeoutMs = boundedHandlerTimeout(options.handlerTimeoutMs);
  const server = createServer(async (request, response) => {
    try {
      if (!requireAuthorized(request, options.token)) {
        sendJson(response, 401, { error: { code: 'RULEOAK_UNAUTHORIZED', message: 'Bearer token required' } }, { 'www-authenticate': 'Bearer' });
        return;
      }
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        sendJson(response, 200, await invokeBounded(options.health, [], handlerTimeoutMs, 'health handler')); return;
      }
      if (request.method === 'GET' && url.pathname === '/v1/pending') {
        sendJson(response, 200, { items: await invokeBounded(options.pending, [], handlerTimeoutMs, 'pending handler') }); return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/authorize') {
        const result = await invokeBounded(options.authorize, [await readJsonBody(request)], handlerTimeoutMs, 'authorize handler');
        sendJson(response, result?.decision?.action === 'deny' ? 403 : result?.decision?.action === 'needs_approval' ? 202 : 200, result);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/approve') {
        const result = await invokeBounded(options.approve, [await readJsonBody(request)], handlerTimeoutMs, 'approve handler');
        sendJson(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/receipts/consume') {
        const result = await invokeBounded(options.consume, [await readJsonBody(request)], handlerTimeoutMs, 'consume handler');
        sendJson(response, result?.ok ? 200 : result?.replayed ? 409 : 400, result); return;
      }
      sendJson(response, 404, { error: { code: 'RULEOAK_NOT_FOUND', message: 'Endpoint not found' } });
    } catch (error) {
      if (response.headersSent) { response.destroy(error); return; }
      sendJson(response, error.statusCode || 500, {
        error: {
          code: error.statusCode === 504 ? 'RULEOAK_HANDLER_TIMEOUT' : error.statusCode ? 'RULEOAK_BAD_REQUEST' : 'RULEOAK_INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  });

  return {
    server,
    listen,
    async start() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(listen.port, listen.host, resolve);
      });
      const address = server.address();
      return { host: listen.host, port: typeof address === 'object' && address ? address.port : listen.port };
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}

function validateUpstream(value, options = {}) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error('MCP upstream URL is invalid'); }
  if (url.username || url.password) throw new Error('MCP upstream URL must not contain credentials');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('MCP upstream URL must use HTTP or HTTPS');
  if (url.protocol === 'http:' && !isLoopbackHost(url.hostname) && options.allowInsecureUpstream !== true) throw new Error('non-loopback MCP upstream must use HTTPS unless allowInsecureUpstream is explicit');
  return url.toString();
}

function boundedUpstreamTimeout(value) {
  const n = Number(value ?? DEFAULT_UPSTREAM_TIMEOUT_MS);
  if (!Number.isFinite(n) || n < 100 || n > 60_000) throw new Error('upstreamTimeoutMs must be between 100 and 60000');
  return Math.floor(n);
}

async function proxyFetch(upstream, request, body, options = {}) {
  const target = new URL(request.url || '/', upstream);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || ['host', 'content-length', 'connection', 'authorization'].includes(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('content-type', 'application/json');
  const signals=[AbortSignal.timeout(boundedUpstreamTimeout(options.upstreamTimeoutMs)),options.signal].filter(Boolean);
  return await (options.fetchImpl||fetch)(target, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    redirect: 'manual',
    signal: signals.length>1?AbortSignal.any(signals):signals[0]
  });
}

async function pipeFetchResponse(upstreamResponse, response) {
  const headers = {};
  for (const [name, value] of upstreamResponse.headers.entries()) {
    if (!['connection', 'transfer-encoding', 'content-encoding'].includes(name.toLowerCase())) headers[name] = value;
  }
  response.writeHead(upstreamResponse.status, headers);
  if (!upstreamResponse.body) { response.end(); return; }
  await pipeline(Readable.fromWeb(upstreamResponse.body), response);
}

async function readUpstreamTextBounded(upstreamResponse,maxBytes=MAX_UPSTREAM_JSON_BYTES){
  if(!upstreamResponse.body){return '';}
  let size=0,text='';const decoder=new TextDecoder();
  for await(const chunk of upstreamResponse.body){const b=Buffer.from(chunk);size+=b.length;if(size>maxBytes)throw Object.assign(new Error(`upstream response exceeds maxBytes (${maxBytes})`),{statusCode:502});text+=decoder.decode(b,{stream:true});}
  return text+decoder.decode();
}

function denialWithApproval(payload, decision, approval) {
  const response = denialResponse(payload, decision);
  if (response?.error?.data && approval?.approval_id) response.error.data.approvalId = approval.approval_id;
  return response;
}

export function createMcpStreamableHttpGateway(options = {}) {
  if (!options.upstream) throw new Error('MCP Streamable HTTP gateway requires an upstream URL');
  const upstream=validateUpstream(options.upstream,options);
  const localFilesystemEffectProfile = options.effectProfile?.kind==='local-filesystem'&&Array.isArray(options.effectProfile.roots)&&options.effectProfile.roots.length?options.effectProfile:null;
  if (!options.policy) throw new Error('MCP Streamable HTTP gateway requires a policy');
  if (!options.recorder) throw new Error('MCP Streamable HTTP gateway requires an evidence recorder');
  const executionSecret=options.executionSecret||options.receiptSecret||randomBytes(32).toString('hex');
  const capabilityPin=options.capabilityPin|| (options.capabilityManifest?buildMcpCapabilityPin(options.capabilityManifest,{createdAt:options.pinCreatedAt,ttlMs:options.pinTtlMs}):null);
  const listen = parseListenAddress(options.listen || '127.0.0.1:7332');
  if (!isLoopbackHost(listen.host) && !options.allowNonLoopback) throw new Error('non-loopback binding requires --allow-non-loopback');
  if (!isLoopbackHost(listen.host) && !options.token) throw new Error('non-loopback binding requires bearer-token authentication');

  const handlerTimeoutMs = boundedHandlerTimeout(options.handlerTimeoutMs);
  async function evaluateItem(item, requestHeaders = {}) {
    const protocol=inspectMcpRequest({headers:requestHeaders,body:item});
    if(!protocol.ok){const decision={action:'deny',reason:protocol.errors.join('; '),matchedRule:'mcp:request-integrity'};return{forward:false,response:denialResponse(item,decision),result:{decision},protocol};}
    if (!isJsonRpcToolCall(item)) return { forward: true, item, protocol };
    if(capabilityPin){const current=typeof options.currentCapabilityManifestProvider==='function'?await invokeBounded(options.currentCapabilityManifestProvider, [], handlerTimeoutMs, 'capability manifest provider'):options.currentCapabilityManifest;const pinned=verifyMcpToolCallAgainstPin(item,capabilityPin,{now:new Date(),currentManifest:current});if(!pinned.ok){const decision={action:'deny',reason:pinned.errors.join('; '),matchedRule:'mcp:capability-pin'};return{forward:false,response:denialResponse(item,decision),result:{decision},protocol,pinned};}}
    const call = adaptMcpToolCall(item, { sessionId: options.sessionId || 'mcp-http' });
    const evaluatedAt = new Date().toISOString();
    const result = evaluatePermissionRequest(call, options.policy, {
      evaluatedAt,
      receiptSecret: options.receiptSecret,
      receiptAudience: 'ruleoak-mcp-http-upstream'
    });
    options.recorder.append(result.action, result.decision, evaluatedAt);
    if (result.decision.action === 'allow') {
      const lease=buildExecutionLease(result,options.policy,{secret:executionSecret,issuedAt:evaluatedAt,ttlMs:options.executionLeaseTtlMs||30000});
      const consumption=consumeExecutionLease(lease,call,options.policy,{secret:executionSecret,storeDir:options.consumedReceiptsDir,now:evaluatedAt,consumedAt:evaluatedAt});
      if (consumption.ok) {const effectContract=localFilesystemEffectProfile?inferMcpEffectContract(item,{maxHashBytes:options.maxEffectHashBytes,allowedRoots:localFilesystemEffectProfile.roots}):null;return { forward: true, item, result, lease, consumption, protocol, effectContract };}
      const decision = { ...result.decision, action: 'deny', reason: consumption.errors.join('; '), matchedRule: consumption.replayed ? 'execution-lease:replay-denied' : 'execution-lease:invalid' };
      return { forward: false, response: denialResponse(item, decision), result: { ...result, decision }, lease, consumption, protocol };
    }
    let approval = null;
    if (result.decision.action === 'needs_approval' && typeof options.queueApproval === 'function') approval = await invokeBounded(options.queueApproval, [result, evaluatedAt], handlerTimeoutMs, 'approval queue provider');
    return { forward: false, response: denialWithApproval(item, result.decision, approval), result, approval };
  }

  const server = createServer(async (request, response) => {
    try {
      if (!requireAuthorized(request, options.token)) {
        sendJson(response, 401, { error: { code: 'RULEOAK_UNAUTHORIZED', message: 'Bearer token required' } }); return;
      }
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: { code: 'RULEOAK_METHOD_NOT_ALLOWED', message: 'MCP gateway accepts POST requests' } }); return;
      }
      const body = await readJsonBody(request);
      const items = Array.isArray(body) ? body : [body];
      if(items.length>MAX_BATCH_ITEMS)throw Object.assign(new Error(`MCP JSON-RPC batch exceeds max items (${MAX_BATCH_ITEMS})`),{statusCode:413});
      const evaluated = [];
      for (const item of items) evaluated.push(await evaluateItem(item,request.headers));
      const allowed = evaluated.filter(item => item.forward).map(item => item.item);
      const denied = evaluated.filter(item => !item.forward && item.response).map(item => item.response);

      if (allowed.length === 0) {
        sendJson(response, 200, Array.isArray(body) ? denied : denied[0] || { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Denied by RuleOak' } });
        return;
      }

      const forwardedBody = Array.isArray(body) ? allowed : allowed[0];
      let upstreamResponse;
      try { upstreamResponse = await proxyFetch(upstream, request, forwardedBody, options); }
      catch (error) {
        const effectTime=new Date().toISOString();
        for(const entry of evaluated.filter(x=>x.forward&&x.lease&&isJsonRpcToolCall(x.item))){const descriptor=adapterDescriptor('mcp-http-gateway');const effect=buildEffectReceipt(entry.lease,{status:'unknown',observation_quality:'ambiguous',requested:{method:'tools/call',name:entry.item.params?.name||null},observed:{response_received:false},error:safeGatewayError(error)},{adapter:'mcp-http-gateway',startedAt:effectTime,completedAt:effectTime,descriptor});const validation=validateEffectReceiptAgainstAdapter(effect,descriptor);if(!validation.ok)throw new Error(`MCP EffectReceipt violates adapter contract: ${validation.errors.join('; ')}`);options.recorder.append({type:'ruleoak.effect.mcp',target:entry.item.params?.name||'',arguments:{},metadata:{lease_id:entry.lease.lease_id,effect_id:effect.effect_id,observation_quality:effect.observation_quality,observation_boundary:effect.observation_boundary}},{action:'allow',reason:'MCP upstream response was not observed; external effect is ambiguous until independently verified',matchedRule:'effect-receipt'},effectTime,{eventType:'ruleoak.effect.mcp',effectReceipt:effect});entry.effectReceipt=effect;}
        await finalizeMcpEffects(evaluated,{...options,baseDir:options.baseDir||process.cwd(),effectProfile:localFilesystemEffectProfile},{upstreamStatus:null,upstreamError:error});throw error;
      }
      const effectTime=new Date().toISOString();
      for(const entry of evaluated.filter(x=>x.forward&&x.lease&&isJsonRpcToolCall(x.item))){const descriptor=adapterDescriptor('mcp-http-gateway');const effect=buildEffectReceipt(entry.lease,{status:'unknown',observation_quality:'remote_response_observed',requested:{method:'tools/call',name:entry.item.params?.name||null},observed:{upstream_http_status:upstreamResponse.status,response_received:true}},{adapter:'mcp-http-gateway',startedAt:effectTime,completedAt:effectTime,descriptor});const validation=validateEffectReceiptAgainstAdapter(effect,descriptor);if(!validation.ok)throw new Error(`MCP EffectReceipt violates adapter contract: ${validation.errors.join('; ')}`);options.recorder.append({type:'ruleoak.effect.mcp',target:entry.item.params?.name||'',arguments:{},metadata:{lease_id:entry.lease.lease_id,effect_id:effect.effect_id,observation_quality:effect.observation_quality,observation_boundary:effect.observation_boundary}},{action:'allow',reason:'MCP upstream response observed; remote business effect remains unproven until postcondition verification',matchedRule:'effect-receipt'},effectTime,{eventType:'ruleoak.effect.mcp',effectReceipt:effect});entry.effectReceipt=effect;}
      await finalizeMcpEffects(evaluated,{...options,baseDir:options.baseDir||process.cwd(),effectProfile:localFilesystemEffectProfile},{upstreamStatus:upstreamResponse.status,upstreamError:null});
      if (denied.length === 0) {
        await pipeFetchResponse(upstreamResponse, response);
        return;
      }

      const contentType = upstreamResponse.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        sendJson(response, 502, { error: { code: 'RULEOAK_MIXED_BATCH_STREAM_UNSUPPORTED', message: 'Mixed allowed/denied JSON-RPC batches cannot be merged with an SSE upstream response' }, denied });
        return;
      }
      if(!/(?:application|text)\/(?:[\w.+-]*\+)?json\b/i.test(contentType)){sendJson(response,502,{error:{code:'RULEOAK_UPSTREAM_INVALID_CONTENT_TYPE',message:'Upstream returned non-JSON for a mixed JSON-RPC batch'},denied});return;}
      const upstreamText = await readUpstreamTextBounded(upstreamResponse,options.maxUpstreamJsonBytes||MAX_UPSTREAM_JSON_BYTES);
      let upstreamJson = [];
      try {
        const parsed = upstreamText ? JSON.parse(upstreamText) : [];
        upstreamJson = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        sendJson(response, 502, { error: { code: 'RULEOAK_UPSTREAM_INVALID_JSON', message: 'Upstream returned non-JSON for a mixed JSON-RPC batch' }, denied });
        return;
      }
      sendJson(response, upstreamResponse.status, [...upstreamJson, ...denied]);
    } catch (error) {
      if (response.headersSent) { response.destroy(error); return; }
      sendJson(response, error.statusCode || 500, { error: { code: error.statusCode === 504 ? 'RULEOAK_HANDLER_TIMEOUT' : error.statusCode ? 'RULEOAK_BAD_REQUEST' : 'RULEOAK_GATEWAY_ERROR', message: error.message } });
    }
  });

  return {
    server,
    listen,
    async start() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(listen.port, listen.host, resolve);
      });
      const address = server.address();
      return { host: listen.host, port: typeof address === 'object' && address ? address.port : listen.port };
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}
