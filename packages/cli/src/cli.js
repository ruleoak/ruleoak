/*
 * Copyright © 2026 Sun Shaobin.
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
 * SPDX-FileCopyrightText: 2026 Sun Shaobin
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvidenceRecorder, RuleOakFlightRecorder, verifyEvidence, RuleOakEngine, RuleOakPolicyValidationError } from '@ruleoak/core';
import { defaultPolicy } from '@ruleoak/core';
import { RuleOakInboundGate, escapeHtml } from './stream-gate.js';

const FIXED_DEMO_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function usage() {
  return `RuleOak CLI\n\nCommands:\n  ruleoak init [--dir <path>] [--telemetry opt-in]\n  ruleoak run [--dir <path>] [--policy <path>] -- <command> [args...]\n  ruleoak replay [--verify] [--html <output.html>] [--dir <path>]\n  ruleoak demo agent-delete\n`;
}

function argValue(args, flag, fallback = undefined) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : fallback;
}

function ensureDir(path) { mkdirSync(path, { recursive: true }); }
export function ruleoakDir(baseDir) { return resolve(baseDir, '.ruleoak'); }
export function evidencePath(baseDir) { return resolve(ruleoakDir(baseDir), 'evidence.jsonl'); }
export function policyPath(baseDir) { return resolve(ruleoakDir(baseDir), 'policy.json'); }

export function initProject(baseDir = process.cwd()) {
  const dir = ruleoakDir(baseDir);
  ensureDir(dir);
  const policy = defaultPolicy(baseDir);
  writeFileSync(policyPath(baseDir), JSON.stringify(policy, null, 2) + '\n');
  const gitkeep = resolve(dir, '.gitkeep');
  if (!existsSync(gitkeep)) writeFileSync(gitkeep, '');
  return { dir, policyPath: policyPath(baseDir), evidencePath: evidencePath(baseDir) };
}

export function loadPolicy(baseDir = process.cwd(), explicitPolicyPath = undefined) {
  const path = explicitPolicyPath ? resolve(explicitPolicyPath) : policyPath(baseDir);
  if (!existsSync(path)) return defaultPolicy(baseDir);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadEngineOrExit(policy) {
  try { return new RuleOakEngine(policy); }
  catch (error) {
    if (error instanceof RuleOakPolicyValidationError) {
      console.error('\n💥 [CRITICAL CONFIGURATION ERROR] RuleOak initialization aborted!');
      console.error('The designated policy layout fails schema compliance constraints.');
      console.error(`Reason: ${error.errors.join('; ')}\n`);
      throw error;
    }
    throw error;
  }
}

export function renderIncidentReport(events, verification, generatedAt = process.env.RULEOAK_REPORT_TIMESTAMP || new Date().toISOString()) {
  const counts = { allow: 0, deny: 0, needs_approval: 0, dry_run_only: 0 };
  for (const event of events) counts[event.decision.action] = (counts[event.decision.action] || 0) + 1;
  const lines = [];
  lines.push('# RuleOak Incident Report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Hash chain: ${verification.ok ? 'intact' : 'BROKEN'}`);
  if (!verification.ok) lines.push(`Verification errors: ${verification.errors.join('; ')}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Events: ${events.length}`);
  lines.push(`- Allowed: ${counts.allow || 0}`);
  lines.push(`- Denied: ${counts.deny || 0}`);
  lines.push(`- Needs approval: ${counts.needs_approval || 0}`);
  lines.push(`- Dry run only: ${counts.dry_run_only || 0}`);
  lines.push('');
  lines.push('## Events');
  lines.push('');
  lines.push('| # | Decision | Action | Target | Reason |');
  lines.push('|---:|---|---|---|---|');
  for (const event of events) {
    lines.push(`| ${event.index} | ${event.decision.action} | ${event.action.type || event.action.action} | ${event.action.target || ''} | ${event.decision.reason || ''} |`);
  }
  lines.push('');
  lines.push('## Limitations');
  lines.push('');
  lines.push('RuleOak evidence records decisions made by RuleOak-controlled flows. The Phase 5 run wrapper is a cross-platform stdio/JSON-RPC line interceptor. It does not claim kernel-level syscall interception and does not observe in-process function calls that never cross filesystem, network, subprocess, or JSON-RPC stream boundaries.');
  return lines.join('\n');
}

export function replay(baseDir = process.cwd(), verify = false) {
  const recorder = new EvidenceRecorder(evidencePath(baseDir));
  const events = recorder.readEvents();
  const verification = verify ? verifyEvidence(events) : { ok: true, errors: [], count: events.length };
  return renderIncidentReport(events, verification);
}

export function generateHtmlTimelineReport(baseDir = process.cwd(), outputHtmlPath = resolve(baseDir, '.ruleoak/report.html')) {
  const recorder = new EvidenceRecorder(evidencePath(baseDir));
  const events = recorder.readEvents();
  const verification = verifyEvidence(events);
  const counts = events.reduce((acc, event) => {
    acc[event.decision.action] = (acc[event.decision.action] || 0) + 1;
    return acc;
  }, { allow: 0, deny: 0, needs_approval: 0, dry_run_only: 0 });
  const itemsHtml = events.map(event => {
    const decision = event.decision.action;
    const badgeClass = decision === 'deny' ? 'deny' : decision === 'needs_approval' ? 'approval' : decision === 'dry_run_only' ? 'dry' : 'allow';
    const args = event.action.arguments || event.action.metadata || {};
    return `<article class="event ${badgeClass}">
      <div class="event-top">
        <div><span class="index">#${event.index}</span> <span class="action">${escapeHtml(event.action.type || event.action.action)}</span></div>
        <span class="badge ${badgeClass}">${escapeHtml(decision.toUpperCase())}</span>
      </div>
      <div class="timestamp">${escapeHtml(event.timestamp)}</div>
      <pre>${escapeHtml(JSON.stringify(args, null, 2))}</pre>
      <p><strong>Reason:</strong> ${escapeHtml(event.decision.reason || '')}</p>
      <p><strong>Matched rule:</strong> <code>${escapeHtml(event.decision.matchedRule || event.decision.matchedPattern || 'none')}</code></p>
      <p class="hash">hash ${escapeHtml(event.hash)}</p>
    </article>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RuleOak Flight Recorder Timeline</title>
<style>
:root{color-scheme:light;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--card:#fff;--allow:#15803d;--deny:#b91c1c;--approval:#b45309;--dry:#0369a1}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}.wrap{max-width:980px;margin:0 auto;padding:40px 20px}header{background:linear-gradient(135deg,#0f172a,#111827);color:white;border-radius:24px;padding:34px;margin-bottom:24px;box-shadow:0 24px 80px rgba(15,23,42,.18)}h1{margin:0 0 8px;font-size:32px;letter-spacing:-.03em}.sub{color:#cbd5e1;margin:0}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:22px 0}.stat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px}.num{font-weight:800;font-size:22px}.label{font-size:12px;color:#cbd5e1}.verify{padding:14px 18px;border-radius:16px;background:${verification.ok ? '#ecfdf5' : '#fef2f2'};border:1px solid ${verification.ok ? '#bbf7d0' : '#fecaca'};color:${verification.ok ? '#166534' : '#991b1b'};margin-bottom:22px}.timeline{position:relative}.event{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--muted);border-radius:18px;padding:18px;margin:16px 0;box-shadow:0 12px 35px rgba(15,23,42,.06)}.event.allow{border-left-color:var(--allow)}.event.deny{border-left-color:var(--deny)}.event.approval{border-left-color:var(--approval)}.event.dry{border-left-color:var(--dry)}.event-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.index{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);font-size:13px}.action{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}.timestamp{color:var(--muted);font-size:12px;margin:4px 0 12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.badge{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px}.badge.allow{background:#dcfce7;color:var(--allow)}.badge.deny{background:#fee2e2;color:var(--deny)}.badge.approval{background:#ffedd5;color:var(--approval)}.badge.dry{background:#e0f2fe;color:var(--dry)}pre{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:12px;overflow-x:auto;font-size:12px}.hash{font-size:11px;color:var(--muted);overflow-wrap:anywhere}footer{color:var(--muted);font-size:13px;margin-top:28px}@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:26px}}
</style>
</head>
<body>
<div class="wrap">
<header>
<h1>RuleOak Flight Recorder Timeline</h1>
<p class="sub">Autonomous agent action sequence report generated from hash-chained Evidence JSONL</p>
<div class="stats">
<div class="stat"><div class="num">${events.length}</div><div class="label">events</div></div>
<div class="stat"><div class="num">${counts.allow || 0}</div><div class="label">allowed</div></div>
<div class="stat"><div class="num">${counts.deny || 0}</div><div class="label">denied</div></div>
<div class="stat"><div class="num">${counts.needs_approval || 0}</div><div class="label">approval</div></div>
<div class="stat"><div class="num">${counts.dry_run_only || 0}</div><div class="label">dry run</div></div>
</div>
</header>
<div class="verify">Hash chain: <strong>${verification.ok ? 'intact' : 'BROKEN'}</strong>${verification.ok ? '' : `<br>${escapeHtml(verification.errors.join('; '))}`}</div>
<section class="timeline">${itemsHtml || '<p>No evidence events found.</p>'}</section>
<footer>Generated by RuleOak replay --html. This is a local single-file report; no external CDN or network resource is required.</footer>
</div>
</body>
</html>`;
  const output = resolve(outputHtmlPath);
  ensureDir(dirname(output));
  writeFileSync(output, html, 'utf8');
  return output;
}

function loadPackageVersion() {
  try {
    const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
    return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version || '0.1.0';
  } catch { return '0.1.0'; }
}

function maybeSendTelemetry(baseDir, mode = 'off') {
  if (mode !== 'opt-in') return { sent: false, reason: 'disabled' };
  const endpoint = process.env.RULEOAK_TELEMETRY_ENDPOINT;
  if (!endpoint) return { sent: false, reason: 'no endpoint configured' };
  // Fire-and-forget, deliberately minimal. No project path, hostname, username, policy, or evidence is sent.
  const payload = JSON.stringify({ event: 'ruleoak_init', version: loadPackageVersion(), at: new Date().toISOString() });
  try {
    import('node:https').then(({ request }) => {
      const url = new URL(endpoint);
      const req = request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } });
      req.on('error', () => {});
      req.end(payload);
    }).catch(() => {});
    return { sent: true, reason: 'queued' };
  } catch {
    return { sent: false, reason: 'failed to queue' };
  }
}

export async function executeStreamInterceptor(targetCommand, args, engine, recorder, opts = {}) {
  const child = spawn(targetCommand, args, {
    cwd: opts.cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: opts.env || process.env
  });

  child.stdout.pipe(opts.stdout || process.stdout, { end: false });
  child.stderr.pipe(opts.stderr || process.stderr, { end: false });

  const gate = new RuleOakInboundGate({
    engine,
    recorder,
    fixedTimestamp: opts.fixedTimestamp || process.env.RULEOAK_FIXED_TIMESTAMP,
    stdout: opts.stdout || process.stdout,
    stderr: opts.stderr || process.stderr,
    childStdin: child.stdin
  });

  let chain = Promise.resolve();
  const enqueue = (chunk) => { chain = chain.then(() => gate.write(chunk)); return chain; };

  if (opts.inputChunks) {
    for (const chunk of opts.inputChunks) await enqueue(chunk);
    await chain;
    await gate.end();
  } else if (process.stdin.readable) {
    process.stdin.on('data', chunk => { enqueue(chunk).catch(error => child.emit('error', error)); });
    process.stdin.on('end', () => { chain.then(() => gate.end()).catch(error => child.emit('error', error)); });
    process.stdin.on('error', error => child.emit('error', error));
  } else {
    await gate.end();
  }

  return await new Promise((resolvePromise, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolvePromise(code ?? 0));
  });
}

export async function runWrapped(commandArgs, baseDir = process.cwd(), opts = {}) {
  if (!commandArgs.length) throw new Error('ruleoak run requires a command after --');
  if (!existsSync(policyPath(baseDir)) && !opts.policyPath) initProject(baseDir);
  const policy = loadPolicy(baseDir, opts.policyPath);
  const engine = loadEngineOrExit(policy);
  const recorder = new RuleOakFlightRecorder(evidencePath(baseDir));
  const [cmd, ...args] = commandArgs;
  return await executeStreamInterceptor(cmd, args, engine, recorder, { cwd: baseDir, inputChunks: opts.inputChunks, stdout: opts.stdout, stderr: opts.stderr, fixedTimestamp: opts.fixedTimestamp, env: { ...process.env, RULEOAK_PROJECT_ROOT: resolve(baseDir), RULEOAK_POLICY_PATH: opts.policyPath || policyPath(baseDir), RULEOAK_EVIDENCE_PATH: evidencePath(baseDir) } });
}

function writeDemoAgent(projectDir) {
  const script = `import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const executionMarker = join(process.cwd(), 'TOOL_EXECUTED_SHOULD_NOT_EXIST.txt');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += String(chunk); });
process.stdin.on('end', () => {
  if (input.includes('filesystem.delete')) {
    writeFileSync(executionMarker, 'The unsafe tool request reached the child process.');
    console.log(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { executed: true } }));
    process.exit(99);
  }
  console.log('scripted MCP-like server: no unsafe request reached the child process');
  process.exit(0);
});
setTimeout(() => {
  console.log('scripted MCP-like server: timeout without unsafe request');
  process.exit(0);
}, 800);
`;
  writeFileSync(join(projectDir, 'agent-delete.mjs'), script);
}

export async function demoAgentDelete() {
  const base = resolve(process.cwd(), '.ruleoak-demo-output');
  rmSync(base, { recursive: true, force: true });
  const project = join(base, 'mock-project');
  const outside = join(base, 'outside-workspace');
  ensureDir(project); ensureDir(outside); ensureDir(join(project, 'assets/nested'));
  writeFileSync(join(project, 'README.md'), '# Mock project\n');
  writeFileSync(join(project, '.env'), 'DEMO_SECRET=inside-workspace\n');
  writeFileSync(join(outside, 'secret.env'), 'OUTSIDE_SECRET=should-not-delete\n');
  initProject(project);
  const policy = loadPolicy(project);
  policy.blockedActions = ['mcp.filesystem.delete', 'filesystem.delete', 'shell.run'];
  policy.allowedActions = ['mcp.filesystem.read', 'filesystem.read'];
  policy.approvalRequired = ['mcp.*', 'filesystem.write', 'network.*', '*'];
  writeFileSync(policyPath(project), JSON.stringify(policy, null, 2) + '\n');
  writeDemoAgent(project);

  process.env.RULEOAK_REPORT_TIMESTAMP = FIXED_DEMO_TIMESTAMP;
  console.log('RuleOak demo: agent-delete');
  console.log('mock project: .ruleoak-demo-output/mock-project');
  console.log('scripted client will send a JSON-RPC tools/call attempting unsafe delete into child stdin');
  console.log('');
  const request = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'filesystem.delete', arguments: { target: '../outside-workspace/secret.env', reason: 'cleanup stale secret' } } }) + '\n';
  const status = await runWrapped(['node', 'agent-delete.mjs'], project, { inputChunks: [request], fixedTimestamp: FIXED_DEMO_TIMESTAMP });
  const report = replay(project, true);
  console.log('');
  console.log(report);
  console.log('');
  const htmlPath = generateHtmlTimelineReport(project, join(project, '.ruleoak/report.html'));
  console.log(`HTML report: ${htmlPath}`);
  console.log(`Evidence: ${evidencePath(project)}`);
  console.log(`Demo status: ${status === 0 ? 'blocked before child execution' : 'unexpected child execution'}`);
  return { project, status };
}

export async function main(args) {
  const command = args[0];
  if (!command || command === '--help' || command === '-h') { console.log(usage()); return; }
  if (command === 'init') {
    const dir = resolve(argValue(args, '--dir', process.cwd()));
    const result = initProject(dir);
    const telemetry = maybeSendTelemetry(dir, argValue(args, '--telemetry', 'off'));
    console.log(`RuleOak initialized at ${result.dir}`);
    console.log(`Policy: ${result.policyPath}`);
    console.log(`Evidence: ${result.evidencePath}`);
    if (telemetry.reason !== 'disabled') console.log(`Telemetry: ${telemetry.sent ? 'opt-in ping queued' : telemetry.reason}`);
    return;
  }
  if (command === 'replay') {
    const dir = resolve(argValue(args, '--dir', process.cwd()));
    const verify = args.includes('--verify');
    const htmlTarget = argValue(args, '--html');
    if (htmlTarget) {
      const output = generateHtmlTimelineReport(dir, htmlTarget);
      console.log(`\n🎉 Visual Timeline Dashboard compiled cleanly to: ${output}`);
      return;
    }
    console.log(replay(dir, verify));
    return;
  }
  if (command === 'run') {
    const sep = args.indexOf('--');
    const dir = resolve(argValue(args, '--dir', process.cwd()));
    const explicitPolicy = argValue(args, '--policy');
    const commandArgs = sep >= 0 ? args.slice(sep + 1) : args.slice(1).filter((_, idx, arr) => {
      // Preserve old fallback but remove known flag pairs.
      const prev = arr[idx - 1];
      return !['--dir', '--policy'].includes(prev) && !['--dir', '--policy'].includes(arr[idx]);
    });
    try {
      const status = await runWrapped(commandArgs, dir, { policyPath: explicitPolicy ? resolve(explicitPolicy) : undefined });
      process.exitCode = status;
    } catch (error) {
      if (error instanceof RuleOakPolicyValidationError) process.exitCode = 1;
      else throw error;
    }
    return;
  }
  if (command === 'demo' && args[1] === 'agent-delete') { await demoAgentDelete(); return; }
  throw new Error(`Unknown command: ${command}\n${usage()}`);
}
