/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, policyPath, recommendPolicyPack, startAuthorizationApi, startMcpHttpGateway } from '../src/cli.js';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}
async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}


assert.equal(recommendPolicyPack(['node', 'agent.js']).pack, 'developer-local');
assert.equal(recommendPolicyPack(['node', 'mcp-server.js']).pack, 'mcp-server-safe');
assert.equal(recommendPolicyPack(['./binary']).pack, 'cautious');

const root = mkdtempSync(join(tmpdir(), 'ruleoak-api-'));
initProject(root, { policyPack: 'cautious' });
writeFileSync(policyPath(root), JSON.stringify({
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [
    { id: 'allow-public-read', effect: 'allow', actions: ['filesystem.read'], resources: ['./public/**'], priority: 100 },
    { id: 'approve-external', effect: 'needs_approval', actions: ['email.send'], resources: ['*'], priority: 100 }
  ]
}, null, 2));

const api = await startAuthorizationApi(root, { listen: '127.0.0.1:0', token: 'test-token' });
const apiUrl = `http://127.0.0.1:${api.address.port}`;
let response = await fetch(`${apiUrl}/v1/health`);
assert.equal(response.status, 401);
response = await fetch(`${apiUrl}/v1/health`, { headers: { authorization: 'Bearer test-token' } });
assert.equal(response.status, 200);
assert.equal((await response.json()).ok, true);
response = await fetch(`${apiUrl}/v1/authorize`, {
  method: 'POST',
  headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
  body: JSON.stringify({
    actor: { type: 'agent', name: 'test', session_id: 'api' },
    action: { name: 'filesystem.read', category: 'file', operation: 'read' },
    resource: { resource: './public/readme.txt', scope: 'local', sensitivity: 'public' },
    arguments: {}
  })
});
assert.equal(response.status, 200);
assert.equal((await response.json()).decision.action, 'allow');
await api.close();

let upstreamCalls = 0;
const upstream = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  upstreamCalls += 1;
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const items = Array.isArray(input) ? input : [input];
  const output = items.filter(item => item.id !== undefined).map(item => ({ jsonrpc: '2.0', id: item.id, result: { forwarded: true } }));
  if (String(request.headers.accept || '').includes('text/event-stream')) {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end('event: message\ndata: {"jsonrpc":"2.0","id":99,"result":{"streamed":true}}\n\n');
  } else {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(Array.isArray(input) ? output : output[0]));
  }
});
const upstreamPort = await listen(upstream);

writeFileSync(policyPath(root), JSON.stringify({
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [
    { id: 'allow-mcp-read', effect: 'allow', actions: ['mcp.filesystem.read'], resources: ['*'], priority: 100 },
    { id: 'deny-mcp-delete', effect: 'deny', actions: ['mcp.filesystem.delete'], resources: ['*'], priority: 200 }
  ]
}, null, 2));
const gateway = await startMcpHttpGateway(root, {
  upstream: `http://127.0.0.1:${upstreamPort}`,
  listen: '127.0.0.1:0'
});
const gatewayUrl = `http://127.0.0.1:${gateway.address.port}`;
response = await fetch(gatewayUrl, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './public/readme.txt' } } })
});
assert.equal((await response.json()).result.forwarded, true);
assert.equal(upstreamCalls, 1);
response = await fetch(gatewayUrl, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { path: './protected.txt' } } })
});
const denied = await response.json();
assert.equal(denied.error.code, -32001);
assert.equal(upstreamCalls, 1, 'denied request never reaches upstream');

response = await fetch(gatewayUrl, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify([
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './public/a.txt' } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { path: './protected.txt' } } }
  ])
});
const mixed = await response.json();
assert.equal(Array.isArray(mixed), true);
assert.equal(mixed.some(item => item.id === 3 && item.result?.forwarded), true);
assert.equal(mixed.some(item => item.id === 4 && item.error?.code === -32001), true);

response = await fetch(gatewayUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'ping', params: {} })
});
assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
assert.match(await response.text(), /streamed/);

await gateway.close();
await close(upstream);
console.log('cli developer adoption tests passed');
