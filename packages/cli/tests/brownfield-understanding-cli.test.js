/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = resolve(new URL('../../..', import.meta.url).pathname);
const cli = resolve(repo, 'packages/cli/bin/ruleoak.js');
const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const understood = run(['understand', '--json']);
assert.equal(understood.status, 0, understood.stderr || understood.stdout);
const graph = JSON.parse(understood.stdout);
assert.equal(graph.understanding_version, '0.1');
assert.equal(graph.repository.intent_manifest, '.ruleoak/intent/ruleoak-community.intent.json');
assert.equal(graph.inference.adapter, 'none');
assert.equal(graph.inference.enabled, false);
assert.ok(graph.summary.nodes > 400);
assert.ok(graph.summary.edges > 500);
assert.ok(graph.unknowns.some(row => row.code === 'semantic_inference_not_run'));

for (const capability of ['cap.effect-boundary','cap.evidence-authority','cap.mcp-boundary']) {
  const id = `intent:${capability}`;
  const implementations = graph.edges.filter(row => row.from === id && row.relation === 'implemented_by');
  const candidateTests = graph.edges.filter(row => row.from === id && row.relation === 'candidate_test');
  assert.ok(implementations.length >= 3, `${capability} should have explicit implementation bindings`);
  assert.ok(candidateTests.length >= 1, `${capability} should have at least one conservative candidate test derived from observed imports`);
  assert.ok(candidateTests.every(row => row.provenance.class === 'INFERRED' && row.provenance.confidence < 1));
}

const temp = mkdtempSync(join(tmpdir(), 'ruleoak-understand-cli-brownfield-understanding-'));
const out = join(temp, 'understanding.json');
const saved = run(['understand', '--out', out]);
assert.equal(saved.status, 0, saved.stderr || saved.stdout);
assert.match(saved.stdout, /Brownfield Understanding v0\.1/);
assert.match(saved.stdout, /UNKNOWN/);
assert.equal(JSON.parse(readFileSync(out, 'utf8')).understanding_version, '0.1');

const explained = run(['explain', 'cap.effect-boundary', '--graph', out]);
assert.equal(explained.status, 0, explained.stderr || explained.stdout);
assert.match(explained.stdout, /Kind: capability/);
assert.match(explained.stdout, /implemented_by/);
assert.match(explained.stdout, /candidate_test/);
assert.match(explained.stdout, /DECLARED/);
assert.match(explained.stdout, /INFERRED 0\.7/);

const traced = run(['trace', 'cap.effect-boundary', '--graph', out, '--depth', '2', '--direction', 'both']);
assert.equal(traced.status, 0, traced.stderr || traced.stdout);
assert.match(traced.stdout, /effect-verification\.js/);
assert.match(traced.stdout, /evaluator\.test\.js/);
assert.match(traced.stdout, /OBSERVED/);
assert.match(traced.stdout, /DECLARED/);
assert.match(traced.stdout, /INFERRED/);

const prohibitedInference = run(['understand', '--inference', 'model']);
assert.equal(prohibitedInference.status, 1);
assert.match(prohibitedInference.stderr, /explicit future adapter/);
const badDepth = run(['trace', 'cap.effect-boundary', '--depth', '99']);
assert.equal(badDepth.status, 1);
assert.match(badDepth.stderr, /integer from 0 to 12/);

console.log('Brownfield Understanding CLI tests passed');
