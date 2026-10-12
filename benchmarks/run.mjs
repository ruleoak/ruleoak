/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  EvidenceRecorder,
  RuleOakFlightRecorder,
  buildDecisionReceipt,
  consumeExecutionGrant,
  evaluatePermissionRequest,
  evaluatePolicy,
  verifyDecisionReceipt
} from '../packages/core/src/index.js';
import { RuleOakInboundGate, extractJsonFragments } from '../packages/cli/src/stream-gate.js';
import { createMcpStreamableHttpGateway } from '../packages/cli/src/http-gateway.js';

const selected = process.argv[2] || 'all';
const quick = process.argv.includes('--quick') || process.env.RULEOAK_BENCHMARK_QUICK === '1';
const iterationFactor = quick ? 0.2 : 1;
const iterations = base => Math.max(20, Math.floor(base * iterationFactor));

function percentile(values, p) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil((p / 100) * ordered.length) - 1)];
}
function latencySummary(values) {
  return {
    samples: values.length,
    p50_ms: percentile(values, 50),
    p95_ms: percentile(values, 95),
    p99_ms: percentile(values, 99),
    mean_ms: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  };
}
function timed(fn, count) {
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const start = performance.now();
    fn(i);
    values.push(performance.now() - start);
  }
  return values;
}
function normalizedCall(i = 0, operation = 'read') {
  return {
    call_id: `bench_${i}`,
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: { type: 'agent', name: 'benchmark', session_id: 'benchmark' },
    tool: { name: `filesystem.${operation}`, category: 'file', operation },
    target: { resource: `./public/file-${i % 100}.txt`, scope: 'local', sensitivity: 'public' },
    arguments: { path: `./public/file-${i % 100}.txt` },
    context: { benchmark: true }
  };
}
function policyWithRules(count, allowedAction = 'filesystem.read') {
  const rules = [];
  for (let i = 0; i < count; i += 1) {
    rules.push({
      id: `rule-${i}`,
      effect: i === count - 1 ? 'allow' : 'needs_approval',
      priority: i,
      actions: [i === count - 1 ? allowedAction : `custom.action.${i}`],
      resources: ['*']
    });
  }
  return { policyVersion: 2, defaultAction: 'deny', rules };
}

async function policyBenchmarks() {
  const scaling = {};
  for (const size of [10, 100, 1000]) {
    const policy = policyWithRules(size);
    const action = {
      type: 'filesystem.read', target: './public/a.txt', arguments: {},
      metadata: { category: 'file', operation: 'read', risk: 'low', data_flow: 'local', side_effect: 'read_only', sensitivity: 'public', actor_type: 'agent' }
    };
    scaling[String(size)] = latencySummary(timed(() => evaluatePolicy(action, policy), iterations(1000)));
  }
  const policy = policyWithRules(100);
  const calls = timed(i => evaluatePermissionRequest(normalizedCall(i), policy), iterations(1000));
  return { decision_latency: latencySummary(calls), policy_size_scaling: scaling };
}

async function receiptBenchmarks() {
  const policy = policyWithRules(10);
  const result = evaluatePermissionRequest(normalizedCall(1), policy);
  const secret = 'benchmark-secret';
  const issuance = timed(i => buildDecisionReceipt(result, policy, { evaluatedAt: new Date(1700000000000 + i).toISOString(), secret }), iterations(1500));
  const receipt = buildDecisionReceipt(result, policy, { secret });
  const verification = timed(() => verifyDecisionReceipt(receipt, { input: result.normalizedCall, policy, secret, requireAllow: true }), iterations(1500));
  const store = mkdtempSync(join(tmpdir(), 'ruleoak-bench-receipts-'));
  const grant = buildDecisionReceipt(result, policy, { secret, decisionId: 'dec_benchmark_once' });
  const first = consumeExecutionGrant(grant, result.normalizedCall, policy, secret, { storeDir: store, audience: 'ruleoak-executor' });
  const replay = consumeExecutionGrant(grant, result.normalizedCall, policy, secret, { storeDir: store, audience: 'ruleoak-executor' });
  rmSync(store, { recursive: true, force: true });
  return {
    issuance_latency: latencySummary(issuance),
    verification_latency: latencySummary(verification),
    replay_prevention: { first_consumed: first.ok && first.consumed, second_rejected: !replay.ok && replay.replayed }
  };
}

async function evidenceBenchmarks() {
  const root = mkdtempSync(join(tmpdir(), 'ruleoak-bench-evidence-'));
  const recorder = new EvidenceRecorder(join(root, 'evidence.jsonl'), { fsync: false });
  const action = { type: 'filesystem.read', target: './public/a.txt', arguments: {}, metadata: {} };
  const decision = { action: 'allow', reason: 'benchmark', matchedRule: 'benchmark' };
  const memoryBefore = process.memoryUsage().heapUsed;
  const samples = timed(i => recorder.append(action, decision, new Date(1700000000000 + i).toISOString()), iterations(500));
  const memoryAfter = process.memoryUsage().heapUsed;
  const events = recorder.readEvents().length;
  rmSync(root, { recursive: true, force: true });
  return {
    append_latency: latencySummary(samples),
    events,
    memory_delta_bytes: memoryAfter - memoryBefore,
    fsync: false,
    limitation: 'fsync=false isolates recorder CPU/file-append overhead; production default fsync=true is storage-dependent'
  };
}

class Sink {
  constructor() { this.bytes = 0; }
  write(chunk) { this.bytes += Buffer.byteLength(String(chunk)); return true; }
  end() {}
}

async function stdioBenchmark() {
  const root = mkdtempSync(join(tmpdir(), 'ruleoak-bench-stdio-'));
  const recorder = new RuleOakFlightRecorder(join(root, 'evidence.jsonl'), { fsync: false });
  const child = new Sink();
  const stdout = new Sink();
  const stderr = new Sink();
  const policy = policyWithRules(10, 'mcp.filesystem.read');
  const gate = new RuleOakInboundGate({ policy, recorder, childStdin: child, stdout, stderr, consumedReceiptsDir: join(root, 'consumed') });
  const count = iterations(500);
  const start = performance.now();
  for (let i = 0; i < count; i += 1) {
    await gate.write(`${JSON.stringify({ jsonrpc: '2.0', id: i, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: `./public/${i}.txt` } } })}\n`);
  }
  await gate.end();
  const elapsed = performance.now() - start;
  const malformed = timed(() => extractJsonFragments('{"jsonrpc":"2.0",]'), iterations(2000));
  rmSync(root, { recursive: true, force: true });
  return {
    messages: count,
    elapsed_ms: elapsed,
    messages_per_second: count / (elapsed / 1000),
    forwarded_bytes: child.bytes,
    malformed_fragment_latency: latencySummary(malformed)
  };
}

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  return server.address().port;
}
async function close(server) {
  await new Promise((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise()));
}

async function httpBenchmark() {
  const root = mkdtempSync(join(tmpdir(), 'ruleoak-bench-http-'));
  mkdirSync(join(root, 'consumed'), { recursive: true });
  const upstream = createServer(async (request, response) => {
    for await (const _ of request) { /* drain */ }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }));
  });
  const upstreamPort = await listen(upstream);
  const recorder = new EvidenceRecorder(join(root, 'evidence.jsonl'), { fsync: false });
  const gateway = createMcpStreamableHttpGateway({
    upstream: `http://127.0.0.1:${upstreamPort}`,
    listen: '127.0.0.1:0',
    policy: policyWithRules(10, 'mcp.filesystem.read'),
    recorder,
    consumedReceiptsDir: join(root, 'consumed')
  });
  const address = await gateway.start();
  const url = `http://127.0.0.1:${address.port}`;
  const count = iterations(100);
  const samples = [];
  for (let i = 0; i < count; i += 1) {
    const start = performance.now();
    const response = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: i, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: `./public/${i}.txt` } } })
    });
    await response.arrayBuffer();
    samples.push(performance.now() - start);
  }
  await gateway.close();
  await close(upstream);
  rmSync(root, { recursive: true, force: true });
  return {
    requests: count,
    request_latency: latencySummary(samples),
    requests_per_second_sequential: count / (samples.reduce((a, b) => a + b, 0) / 1000),
    concurrency: 1,
    limitation: 'Loopback sequential benchmark; production throughput depends on upstream server, network and evidence storage'
  };
}

const started = new Date().toISOString();
const output = {
  benchmark_version: '1.0',
  selected,
  quick,
  started_at: started,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: (await import('node:os')).cpus().length,
    memory_total_bytes: (await import('node:os')).totalmem()
  },
  results: {},
  limitations: [
    'These are reproducible local microbenchmarks, not an independent security or performance audit.',
    'Results vary by CPU, filesystem, Node.js build, operating system and upstream transport.',
    'No result is selected or omitted based on whether it is favorable.'
  ]
};
if (['all', 'policy'].includes(selected)) output.results.policy = await policyBenchmarks();
if (['all', 'receipt'].includes(selected)) output.results.receipts = await receiptBenchmarks();
if (['all', 'evidence'].includes(selected)) output.results.evidence = await evidenceBenchmarks();
if (['all', 'mcp'].includes(selected)) {
  output.results.mcp_stdio = await stdioBenchmark();
  output.results.mcp_streamable_http = await httpBenchmark();
}
output.finished_at = new Date().toISOString();
console.log(JSON.stringify(output, null, 2));
