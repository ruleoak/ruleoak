/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
const root=resolve(new URL('../../..',import.meta.url).pathname),bin=resolve(root,'packages/cli/bin/ruleoak.js'),memory=resolve(root,'.ruleoak/memory/ruleoak-community.memory.json');
const v=JSON.parse(execFileSync(process.execPath,[bin,'memory','validate',memory,'--json'],{encoding:'utf8'}));assert.equal(v.valid,true);assert(v.records>=18);
const r=JSON.parse(execFileSync(process.execPath,[bin,'memory','relevant','prevent','blind','retry','when','effect','verification','is','uncertain','--dir',root,'--json'],{encoding:'utf8',maxBuffer:32*1024*1024}));assert(r.regressions.some(x=>x.record_id==='memory.reg.effect-blind-retry'));assert(r.required_evidence_types.includes('property'));console.log('Engineering Memory CLI tests passed');
