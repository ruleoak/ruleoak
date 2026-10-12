/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as protocol from '@ruleoak/protocol';
import * as core from '../src/index.js';
import { validatePublicApiStability } from '../../../scripts/public_api_stability_qa.mjs';

const root=resolve(new URL('../../..',import.meta.url).pathname);
const registry=JSON.parse(readFileSync(resolve(root,'packages/protocol/stability/api-maturity.json'),'utf8'));
const snapshot=JSON.parse(readFileSync(resolve(root,'packages/protocol/stability/stable-api-snapshot.json'),'utf8'));

assert.equal(registry.ruleoak_release,'0.50.0');
assert.equal(registry.one_point_zero.declared,false);
assert.deepEqual(registry.maturity_levels,['experimental','preview','stable']);
for(const name of snapshot.stable_exports['@ruleoak/protocol'])assert.ok(name in protocol,`missing stable protocol export ${name}`);
for(const name of snapshot.stable_exports['@ruleoak/core'])assert.ok(name in core,`missing stable core export ${name}`);

const direct=await validatePublicApiStability({root});
assert.deepEqual(direct.errors,[]);

// Accidental stable API removal must fail even if the current registry itself is untouched.
const temp=mkdtempSync(join(tmpdir(),'ruleoak-stability-negative-'));
try{
  const mutated=structuredClone(snapshot);
  mutated.stable_exports['@ruleoak/protocol'].push('DefinitelyRemovedStableExport');
  const file=join(temp,'snapshot.json');writeFileSync(file,JSON.stringify(mutated,null,2)+'\n');
  const check=await validatePublicApiStability({root,snapshot:file,runtime:false});
  assert.ok(check.errors.some(e=>e.includes('DefinitelyRemovedStableExport')));
}finally{rmSync(temp,{recursive:true,force:true});}

// Editing the current snapshot to hide a stable removal must also fail against the retained historical floor.
const tempFloor=mkdtempSync(join(tmpdir(),'ruleoak-stability-floor-negative-'));
try{
  const mutated=structuredClone(snapshot);
  const removed=mutated.stable_exports['@ruleoak/protocol'].shift();
  const file=join(tempFloor,'snapshot.json');writeFileSync(file,JSON.stringify(mutated,null,2)+'\n');
  const check=await validatePublicApiStability({root,snapshot:file,runtime:false});
  assert.ok(check.errors.some(e=>e.includes('historical floor')&&e.includes(removed)));
}finally{rmSync(tempFloor,{recursive:true,force:true});}

// Deprecated public alias must warn once while returning canonical content.
const child=spawnSync(process.execPath,['--input-type=module','-e',`import {stableStringify} from ${JSON.stringify(resolve(root,'packages/core/src/index.js'))}; console.log(stableStringify({b:2,a:1})); console.log(stableStringify({a:1}));`],{cwd:root,encoding:'utf8'});
assert.equal(child.status,0,child.stderr);
assert.match(child.stdout,/\{"a":1,"b":2\}/);
assert.equal((child.stderr.match(/RULEOAK_DEP_STABLE_STRINGIFY/g)||[]).length,1,child.stderr);

console.log('Public API Stability tests passed');
