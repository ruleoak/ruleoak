/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateIntentRecompilePackage, validateIntentRecompileReport } from '../src/intent-compile.js';
const root=resolve(new URL('../../..',import.meta.url).pathname);
const pkg=JSON.parse(readFileSync(resolve(root,'qa/recompile/engineering-memory-relevance.intent-package.json'),'utf8'));
assert.equal(validateIntentRecompilePackage(pkg).valid,true);
assert.equal(validateIntentRecompilePackage({...pkg,intent_recompile_version:'9.9'}).valid,false);
const report={intent_recompile_version:'0.1',experiment_id:'recompile:test',status:'VERIFIED',synthesis_authority:'NON_AUTHORITATIVE_SYNTHESIS',baseline:{source_sha256:pkg.baseline.source_sha256},replacement:{source_sha256:'sha256:'+'0'.repeat(64)},equivalence:{status:'PASS'},model_execution:{evidence_authority:'EXTERNAL_TO_MODEL_EXECUTION'}};
assert.equal(validateIntentRecompileReport(report).valid,true);
assert.equal(validateIntentRecompileReport({...report,synthesis_authority:'AUTHORITATIVE'}).valid,false);
console.log('Intent Recompilation protocol tests passed');
