/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
function sha(path){return createHash('sha256').update(readFileSync(path)).digest('hex')}
function build(dir){execFileSync(process.execPath,['scripts/build_release_candidate.mjs','--out-dir',dir],{stdio:'pipe',env:{...process.env,SOURCE_DATE_EPOCH:'946684800'}});return Object.fromEntries(readdirSync(dir).sort().map(n=>[n,sha(join(dir,n))]));}
const a=mkdtempSync(join(tmpdir(),'ruleoak-release-a-')); const b=mkdtempSync(join(tmpdir(),'ruleoak-release-b-'));
try { const ah=build(a), bh=build(b); assert.deepEqual(ah,bh,'release candidate bytes must reproduce exactly'); assert.ok(Object.keys(ah).some(n=>n.endsWith('.tgz'))); assert.ok(ah['sbom.cdx.json']); console.log(`release reproducibility check passed: ${Object.keys(ah).length} artifacts byte-identical`); }
finally { rmSync(a,{recursive:true,force:true}); rmSync(b,{recursive:true,force:true}); }
