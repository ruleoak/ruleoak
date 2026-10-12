/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {
  RuleOakAuthorizationError,
  adaptFilesystemAction,
  adaptHttpAction,
  adaptMcpToolCall,
  adaptOpenAIToolCall,
  adaptShellCommand,
  authorize,
  guardFunction,
  guardTools
} from '../src/index.js';

const policy = {
  policyVersion: 2,
  defaultAction: 'deny',
  rules: [
    { id: 'allow-public-read', effect: 'allow', priority: 20, actions: ['filesystem.read', 'mcp.filesystem.read'], resources: ['*'], riskAtMost: 'low' },
    { id: 'review-email', effect: 'needs_approval', priority: 30, actions: ['email.send'], resources: ['*'] }
  ]
};

const openai = adaptOpenAIToolCall({
  id: 'tool_1',
  type: 'function',
  function: { name: 'filesystem.read', arguments: JSON.stringify({ path: './public/a.txt' }) },
  vendor_extension: 'preserved'
}, { sensitivity: 'public', scope: 'local' });
assert.equal(openai.tool.name, 'filesystem.read');
assert.equal(openai.arguments.path, './public/a.txt');
assert.equal(openai.context.adapter_metadata.vendor_extension, 'preserved');

const mcp = adaptMcpToolCall({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'filesystem.read', arguments: { path: './public/b.txt' } }, trace_id: 'trace-7' }, { sensitivity: 'public' });
assert.equal(mcp.tool.name, 'mcp.filesystem.read');
assert.equal(mcp.context.adapter_metadata.trace_id, 'trace-7');

const shell = adaptShellCommand('node', ['agent.js'], { cwd: '/tmp/work' });
assert.equal(shell.tool.category, 'shell');
assert.deepEqual(shell.arguments.args, ['agent.js']);

const file = adaptFilesystemAction('read', './public/c.txt', {}, { sensitivity: 'public' });
assert.equal(file.target.resource, './public/c.txt');

const http = adaptHttpAction({ method: 'POST', url: 'https://example.test/hook', headers: { authorization: 'Bearer secret-token-value' }, body: { ok: true } });
assert.equal(http.target.scope, 'external');
assert.equal(http.tool.operation, 'send');

const authorized = authorize({
  actor: { type: 'agent', name: 'adapter-test', session_id: 'sess-adapter' },
  action: { name: 'filesystem.read', category: 'file', operation: 'read' },
  resource: { resource: './public/a.txt', scope: 'local', sensitivity: 'public' },
  arguments: { path: './public/a.txt', api_key: 'sk-1234567890123456789012345' }
}, { policy, evaluatedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(authorized.action.arguments.api_key, '[REDACTED_SECRET]');

let called = 0;
const guardedRead = guardFunction(async path => { called += 1; return `read:${path}`; }, {
  name: 'filesystem.read', category: 'file', operation: 'read', sensitivity: 'public', target: './public/a.txt', mapArguments: args => ({ path: args[0] })
}, { policy, evaluatedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(await guardedRead('./public/a.txt'), 'read:./public/a.txt');
assert.equal(called, 1);

const denied = guardFunction(async () => 'no', { name: 'shell.execute', category: 'shell', operation: 'execute', target: 'rm -rf /' }, { policy });
await assert.rejects(() => denied(), RuleOakAuthorizationError);

const tools = guardTools({
  'filesystem.read': async path => `tool:${path}`,
  'shell.execute': async () => 'unsafe'
}, { policy, actor: { type: 'agent', name: 'tool-test', session_id: 'sess-tools' } });
assert.equal(await tools['filesystem.read']('./public/z.txt'), 'tool:./public/z.txt');
await assert.rejects(() => tools['shell.execute'](), RuleOakAuthorizationError);

console.log('core action adapter tests passed');
