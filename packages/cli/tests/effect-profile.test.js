/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStdioEffectProfile } from '../src/effect-profile.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-effect-profile-'));
const allowed=join(root,'allowed');mkdirSync(allowed);
let p=resolveStdioEffectProfile('npx',['-y','@modelcontextprotocol/server-filesystem',allowed],{cwd:root});
assert.equal(p?.kind,'local-filesystem');assert.equal(p.roots.length,1);assert.equal(p.provenance,'recognized-reference-server');
assert.equal(resolveStdioEffectProfile('node',['custom-server.mjs',allowed],{cwd:root}),null,'generic server must not gain filesystem effect semantics by tool-name convention');
p=resolveStdioEffectProfile('node',['custom-server.mjs'],{cwd:root,explicitProfile:'local-filesystem',effectRoots:[allowed]});assert.equal(p?.provenance,'explicit-reviewed-route');
assert.equal(resolveStdioEffectProfile('node',['custom-server.mjs'],{cwd:root,explicitProfile:'local-filesystem',effectRoots:[join(root,'missing')]}),null,'effect roots must already exist and be directories');
console.log('Stdio effect profile provenance tests passed');
