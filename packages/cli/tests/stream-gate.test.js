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

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, runWrapped, policyPath, evidencePath, generateHtmlTimelineReport } from '../src/cli.js';
import { extractJsonFragments } from '../src/stream-gate.js';

async function expectRejectsWithoutConsoleNoise(fn, expected) {
  const originalError = console.error;
  const messages = [];
  console.error = (...args) => { messages.push(args.join(' ')); };
  try {
    await assert.rejects(fn, expected);
  } finally {
    console.error = originalError;
  }
  assert.match(messages.join('\n'), /CRITICAL CONFIGURATION ERROR/);
}

function setupProject(name = 'ruleoak-gate-') {
  const dir = mkdtempSync(join(tmpdir(), name));
  initProject(dir);
  const policy = {
    defaultAction: 'deny',
    allowedActions: ['mcp.filesystem.read', 'mcp.echo'],
    approvalRequired: ['mcp.database.*'],
    blockedActions: ['mcp.filesystem.delete', 'mcp.shell.run']
  };
  writeFileSync(policyPath(dir), JSON.stringify(policy, null, 2));
  return dir;
}

function writeServer(dir) {
  writeFileSync(join(dir, 'server.mjs'), `import { writeFileSync } from 'node:fs';
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { input += String(c); });
process.stdin.on('end', () => {
  writeFileSync('CHILD_STDIN_CAPTURE.txt', input);
  if (input.includes('filesystem.delete')) writeFileSync('TOOL_EXECUTED.txt', 'unsafe reached child');
  console.log('SERVER_DONE');
});
`);
}

function memoryStream() {
  let data = '';
  return { write(chunk) { data += String(chunk); }, get data() { return data; }, on() {}, once() {}, emit() {} };
}

{
  const pretty = '{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "tools/call",\n  "params": { "name": "filesystem.delete", "arguments": { "target": "x" } }\n}\n';
  const parsed = extractJsonFragments('noise before\n' + pretty);
  assert.equal(parsed.fragments[0].kind, 'noise');
  assert.equal(parsed.fragments[1].kind, 'json');
  assert.equal(parsed.fragments[1].value.method, 'tools/call');
}

{
  const dir = setupProject();
  try {
    writeServer(dir);
    const stdout = memoryStream();
    const stderr = memoryStream();
    const request = JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { target: '../secret.env', poisoned: '<script>alert(1)</script>' } } }) + '\n';
    const code = await runWrapped(['node', 'server.mjs'], dir, { inputChunks: [request], stdout, stderr, fixedTimestamp: '2026-01-01T00:00:00.000Z' });
    assert.equal(code, 0);
    assert.equal(existsSync(join(dir, 'TOOL_EXECUTED.txt')), false, 'blocked request must not reach child stdin');
    const childInput = readFileSync(join(dir, 'CHILD_STDIN_CAPTURE.txt'), 'utf8');
    assert.doesNotMatch(childInput, /filesystem\.delete/);
    assert.match(stdout.data, /RuleOak Firewall/);
    const evidence = readFileSync(evidencePath(dir), 'utf8');
    assert.match(evidence, /mcp\.filesystem\.delete/);
    const htmlPath = generateHtmlTimelineReport(dir, join(dir, '.ruleoak/report.html'));
    const html = readFileSync(htmlPath, 'utf8');
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /tailwind|cdn\.tailwindcss|<script\s/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

{
  const dir = setupProject();
  try {
    writeServer(dir);
    const stdout = memoryStream();
    const stderr = memoryStream();
    const batch = JSON.stringify([
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'echo', arguments: { message: 'safe' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { target: '../secret.env' } } }
    ]) + '\n';
    await runWrapped(['node', 'server.mjs'], dir, { inputChunks: ['non-json noise\n', batch], stdout, stderr, fixedTimestamp: '2026-01-01T00:00:00.000Z' });
    const childInput = readFileSync(join(dir, 'CHILD_STDIN_CAPTURE.txt'), 'utf8');
    assert.match(childInput, /non-json noise/);
    assert.match(childInput, /mcp|tools\/call|echo/);
    assert.doesNotMatch(childInput, /filesystem\.delete/);
    assert.equal(existsSync(join(dir, 'TOOL_EXECUTED.txt')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

{
  const dir = setupProject();
  try {
    writeFileSync(join(dir, 'server.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync('STARTED.txt','yes');`);
    const badPolicy = join(dir, 'bad-policy.json');
    writeFileSync(badPolicy, JSON.stringify({ defaultAction: 'explode' }));
    await expectRejectsWithoutConsoleNoise(() => runWrapped(['node', 'server.mjs'], dir, { policyPath: badPolicy, inputChunks: ['anything\n'] }), /policy validation failed/);
    assert.equal(existsSync(join(dir, 'STARTED.txt')), false, 'bad policy must fail closed before child starts');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('stream gate tests passed');
