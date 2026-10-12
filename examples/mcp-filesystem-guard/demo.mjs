/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from 'node:http';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RuleOakFlightRecorder } from '../../packages/core/src/index.js';
import { RuleOakInboundGate } from '../../packages/cli/src/stream-gate.js';
import {
  decidePendingApproval,
  generateHtmlTimelineReport,
  initProject,
  listPendingApprovals,
  policyPath,
  startMcpHttpGateway
} from '../../packages/cli/src/cli.js';

class Sink {
  constructor() { this.text = ''; }
  write(chunk) { this.text += String(chunk); return true; }
  end() {}
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

const POLICY = {
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [
    { id: 'deny-protected-delete', effect: 'deny', priority: 300, actions: ['mcp.filesystem.delete'], resources: ['./protected/**'] },
    { id: 'approve-private-read', effect: 'needs_approval', priority: 200, actions: ['mcp.filesystem.read'], resources: ['./private/**'] },
    { id: 'allow-public-read', effect: 'allow', priority: 100, actions: ['mcp.filesystem.read'], resources: ['./public/**'] }
  ]
};

export async function runDemo(options = {}) {
  const baseDir = resolve(options.baseDir || '.ruleoak-demo-output/mcp-filesystem-guard');
  rmSync(baseDir, { recursive: true, force: true });
  mkdirSync(baseDir, { recursive: true });
  initProject(baseDir, { policyPack: 'mcp-server-safe' });
  writeFileSync(policyPath(baseDir), JSON.stringify(POLICY, null, 2));

  const stdioChild = new Sink();
  const stdioClient = new Sink();
  const stdioErrors = new Sink();
  const stdioRecorder = new RuleOakFlightRecorder(resolve(baseDir, '.ruleoak/stdio-evidence.jsonl'), { fsync: false });
  const stdioGate = new RuleOakInboundGate({
    policy: POLICY,
    recorder: stdioRecorder,
    childStdin: stdioChild,
    stdout: stdioClient,
    stderr: stdioErrors,
    autoConsumeReceipts: true,
    consumedReceiptsDir: resolve(baseDir, '.ruleoak/stdio-consumed'),
    approvalHandler: async () => ({ decision: 'allow_once', reason: 'operator approved private read in stdio demo', channel: 'demo' })
  });
  await stdioGate.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './public/readme.txt', sensitivity: 'public' } } })}\n`);
  await stdioGate.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './private/note.txt', sensitivity: 'private' } } })}\n`);
  await stdioGate.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { path: './protected/important.txt' } } })}\n`);
  await stdioGate.end();

  let upstreamCalls = 0;
  const upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    upstreamCalls += 1;
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const items = Array.isArray(payload) ? payload : [payload];
    const results = items.filter(item => item.id !== undefined).map(item => ({ jsonrpc: '2.0', id: item.id, result: { forwarded: true, simulated: true } }));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(Array.isArray(payload) ? results : results[0]));
  });
  const upstreamPort = await listen(upstream);
  const gateway = await startMcpHttpGateway(baseDir, {
    upstream: `http://127.0.0.1:${upstreamPort}`,
    listen: '127.0.0.1:0'
  });
  const gatewayUrl = `http://127.0.0.1:${gateway.address.port}`;

  const publicResponse = await fetch(gatewayUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './public/readme.txt', sensitivity: 'public' } } })
  }).then(response => response.json());
  const privateResponse = await fetch(gatewayUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './private/note.txt', sensitivity: 'private' } } })
  }).then(response => response.json());
  const deleteResponse = await fetch(gatewayUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { path: './protected/important.txt' } } })
  }).then(response => response.json());

  const pending = listPendingApprovals(baseDir);
  let decided = null;
  if (pending.length) decided = decidePendingApproval(baseDir, pending[0].approval_id, 'allow_once');
  await gateway.close();
  await close(upstream);
  const report = generateHtmlTimelineReport(baseDir, resolve(baseDir, '.ruleoak/report.html'));

  const result = {
    baseDir,
    stdioForwarded: stdioChild.text,
    stdioClient: stdioClient.text,
    publicResponse,
    privateResponse,
    deleteResponse,
    pendingCount: pending.length,
    decided: decided?.record || null,
    upstreamCalls,
    report
  };
  if (!options.quiet) {
    console.log('RuleOak MCP filesystem guard');
    console.log(`stdio public/private reads forwarded: ${stdioChild.text.includes('"id":1') && stdioChild.text.includes('"id":2') ? 'yes' : 'no'}`);
    console.log(`stdio protected delete forwarded: ${stdioChild.text.includes('"id":3') ? 'unexpected' : 'no'}`);
    console.log(`Streamable HTTP public read: ${publicResponse.result?.forwarded ? 'forwarded' : 'failed'}`);
    console.log(`Streamable HTTP private read: approval ${privateResponse.error?.data?.approvalId || 'not queued'}`);
    console.log(`Streamable HTTP protected delete: ${deleteResponse.error?.code === -32001 ? 'denied' : 'unexpected'}`);
    console.log(`Approval lifecycle: ${decided ? 'pending -> allow_once' : 'missing'}`);
    console.log(`Evidence report: ${report}`);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await runDemo();
