/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'../../..');
const runner=resolve(root,'packages/protocol/conformance/runner.mjs');
const good=resolve(root,'packages/core/tests/fixtures/ruleoak-conformance-implementation.mjs');
const bad=resolve(root,'packages/protocol/conformance/fixtures/invalid-implementation.mjs');
const rootPkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const manifest=JSON.parse(readFileSync(resolve(root,'packages/protocol/conformance/manifest.json'),'utf8'));
assert.equal(manifest.conformance_version,'1.0');
assert.equal(manifest.ruleoak_release,rootPkg.version);
assert.equal(manifest.vector_count,11);
assert.equal(readdirSync(resolve(root,'packages/protocol/conformance/vectors')).filter(x=>x.endsWith('.json')).length,11);

function run(implementation,format='json'){
  return spawnSync(process.execPath,[runner,'--implementation',implementation,'--format',format],{cwd:root,encoding:'utf8'});
}
const pass1=run(good),pass2=run(good);
assert.equal(pass1.status,0,pass1.stderr||pass1.stdout);
assert.equal(pass2.status,0,pass2.stderr||pass2.stdout);
assert.equal(pass1.stdout,pass2.stdout,'conformance JSON must be deterministic');
const report=JSON.parse(pass1.stdout);
assert.equal(report.status,'PASS');
assert.equal(report.results.length,22);
assert.equal(report.results.filter(x=>x.expectation==='valid').length,11);
assert.equal(report.results.filter(x=>x.expectation==='invalid').length,11);
assert.equal(report.packaging.every(x=>x.ok),true);
const fail=run(bad);
assert.equal(fail.status,2,fail.stderr||fail.stdout);
assert.equal(JSON.parse(fail.stdout).status,'FAIL');

const runnerText=readFileSync(runner,'utf8');
for(const forbidden of ['@ruleoak/core','@ruleoak/protocol','ruleoak-reference']) assert.equal(runnerText.includes(forbidden),false,`neutral runner must not depend on ${forbidden}`);
console.log('Public Protocol Conformance tests passed');
