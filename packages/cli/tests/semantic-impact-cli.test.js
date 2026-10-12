/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const repo=resolve(new URL('../../..',import.meta.url).pathname),cli=resolve(repo,'packages/cli/bin/ruleoak.js');
const run=args=>spawnSync(process.execPath,[cli,...args],{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024});
let r=run(['impact','prevent blind retry when effect verification is unavailable','--json']);
assert.equal(r.status,0,r.stderr||r.stdout);const impact=JSON.parse(r.stdout);
assert.equal(impact.impact_version,'0.1');assert.deepEqual(impact.affected_capability_ids,['cap.effect-boundary','cap.mcp-boundary']);assert.equal(impact.conflicts.length,0);assert.ok(impact.relevant.incidents.some(x=>x.id==='incident.execution-lease-contention'));assert.ok(impact.evidence.missing_types.includes('integration'));
const temp=mkdtempSync(join(tmpdir(),'ruleoak-impact-cli-semantic-impact-')),out=join(temp,'impact.json');
r=run(['impact','raise MCP HTTP latency budget to 500 ms','--out',out]);assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/Semantic Impact v0\.1/);assert.match(r.stdout,/Conflicts: 1/);const saved=JSON.parse(readFileSync(out,'utf8'));assert.ok(saved.conflicts.some(x=>x.protected_intent_id==='budget.mcp-http-p99'));
r=run(['impact','change login screen color','--json']);assert.equal(r.status,0,r.stderr||r.stdout);const unknown=JSON.parse(r.stdout);assert.deepEqual(unknown.affected_capability_ids,[]);assert.equal(unknown.risk.level,'UNKNOWN');
r=run(['impact']);assert.equal(r.status,1);assert.match(r.stderr,/requires <proposed behavioral change>/);
console.log('Semantic Impact CLI tests passed');
